#!/usr/bin/env python3
"""
Génère un fichier SQL d'import pour Supabase depuis le fichier Excel Accolta.xlsx
Usage : python3 scripts/generate_sql.py
Le fichier output/import_data.sql sera créé, à exécuter dans l'éditeur SQL de Supabase.
"""

import pandas as pd
import os
import sys

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'Accolta.xlsx')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'output', 'import_data.sql')

def escape_sql(val):
    if val is None:
        return 'NULL'
    s = str(val).replace("'", "''")
    return f"'{s}'"

def main():
    if not os.path.exists(EXCEL_PATH):
        print(f"Fichier non trouvé : {EXCEL_PATH}")
        print("Place Accolta.xlsx à la racine du projet.")
        sys.exit(1)

    print("Lecture du fichier Excel…")
    df = pd.read_excel(EXCEL_PATH)
    df.columns = [c.strip() for c in df.columns]

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    col_map = {
        'artiste': ['Artistu', 'artiste', 'Artiste'],
        'album':   ['Dischettu', 'album', 'Album'],
        'titre':   ['Titulu', 'titre', 'Titre'],
        'annee':   ['Annata', 'annee', 'Année'],
        'paroles': ['Parolle', 'paroles', 'Paroles'],
    }

    def get_col(key):
        for c in col_map[key]:
            if c in df.columns:
                return c
        return None

    cols = {k: get_col(k) for k in col_map}
    print("Colonnes détectées :", {k: v for k, v in cols.items() if v})

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write("-- Import Accolta — généré automatiquement\n")
        f.write("-- À exécuter dans l'éditeur SQL de Supabase\n\n")
        f.write("INSERT INTO chansons (artiste, album, titre, annee, paroles) VALUES\n")

        rows = []
        for i, row in df.iterrows():
            artiste = str(row[cols['artiste']]).strip() if cols['artiste'] and pd.notna(row[cols['artiste']]) else ''
            titre   = str(row[cols['titre']]).strip()   if cols['titre']   and pd.notna(row[cols['titre']])   else ''
            if not artiste or not titre:
                continue
            album   = str(row[cols['album']]).strip()   if cols['album']   and pd.notna(row[cols['album']])   else ''
            annee_raw = row[cols['annee']] if cols['annee'] else None
            try:
                annee = int(float(annee_raw)) if annee_raw and pd.notna(annee_raw) else None
            except:
                annee = None
            paroles = str(row[cols['paroles']]).strip() if cols['paroles'] and pd.notna(row[cols['paroles']]) else None

            a  = escape_sql(artiste)
            al = escape_sql(album)
            t  = escape_sql(titre)
            an = str(annee) if annee else 'NULL'
            p  = escape_sql(paroles)
            rows.append(f"  ({a}, {al}, {t}, {an}, {p})")

        f.write(',\n'.join(rows))
        f.write('\nON CONFLICT (artiste, titre) DO UPDATE SET\n')
        f.write('  album   = EXCLUDED.album,\n')
        f.write('  annee   = EXCLUDED.annee,\n')
        f.write('  paroles = EXCLUDED.paroles;\n')

    print(f"\n✅ {len(rows)} chansons exportées")
    print(f"📄 Fichier SQL : {OUTPUT_PATH}")
    print("\nProcédure :")
    print("1. Va sur supabase.com > ton projet > SQL Editor")
    print("2. Colle le contenu de output/import_data.sql")
    print("3. Clique sur Run")

if __name__ == '__main__':
    main()
