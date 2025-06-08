#!/usr/bin/env python3
"""
scrape_and_refresh.py

This script:
  1. Clears all `*2` tables via your SQL truncate script
  2. Scrapes UNC courses and uploads to Supabase
  3. Rebuilds free-slot availability via your SQL query

Requires:
  - A Supabase `run_sql` RPC defined in your database:
      create or replace function run_sql(sql text)
      returns void as $$ begin execute sql; end; $$
      language plpgsql security definer;
  - `sqlparse` installed (`pip install sqlparse`)
  - `scraper/clear_appended_tables.sql` and `sql/create_free_rooms.sql` exist
"""

import os
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
import sqlparse
from supabase import create_client, Client
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup, Tag

# -- 1) Load environment and init Supabase -----------------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
assert SUPABASE_KEY and SUPABASE_KEY.startswith("eyJ"), "Service role key not loaded!"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -- 2) Helper to run raw SQL via Supabase HTTP API ---------------------------
def run_sql_file(path: str):
    """
    Splits SQL file into statements and runs each via run_sql RPC.
    """
    with open(path, 'r') as f:
        raw_sql = f.read()
    for statement in sqlparse.split(raw_sql):
        stmt = statement.strip()
        if not stmt:
            continue
        supabase.rpc('run_sql', {'sql': stmt}).execute()

# -- 3) Scraper functions -----------------------------------------------------
def scrape_subject(term: str, subject_code: str) -> list[dict]:
    chrome_opts = Options()
    chrome_opts.binary_location = "/usr/bin/chromium-browser"
    chrome_opts.add_argument("--headless")
    chrome_opts.add_argument("--no-sandbox")
    chrome_opts.add_argument("--disable-dev-shm-usage")
    chrome_opts.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=chrome_opts)
    driver.set_page_load_timeout(30)
    driver.get("https://reports.unc.edu/class-search/")

    # Input term and subject, click search
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "term"))).send_keys(term)
    elem = driver.find_element(By.NAME, "subject")
    elem.clear(); elem.send_keys(subject_code)
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.ID, "filter-submit"))).click()
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//table")))

    # Scroll to load all rows
    for _ in range(5):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1.0)

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    table = soup.find('table')
    if not table:
        driver.quit()
        return []

    header_count = len(table.find('tr').find_all('th'))
    idx_cat, idx_sched, idx_room = 1, 9, 10

    rows = []
    last_cat = ''
    for tr in table.find_all('tr')[1:]:
        tds = tr.find_all('td')
        if len(tds) < header_count:
            tds = [None]*(header_count-len(tds)) + tds
        if len(tds) != header_count:
            continue
        raw = tds[idx_cat]
        cat = raw.get_text(strip=True) if isinstance(raw, Tag) else ''
        if cat:
            last_cat = cat
        sched = tds[idx_sched].get_text(strip=True) if isinstance(tds[idx_sched], Tag) else ''
        room = tds[idx_room].get_text(strip=True) if isinstance(tds[idx_room], Tag) else ''
        rows.append({
            'catalog_number': last_cat,
            'schedule': sched,
            'room': room,
            'scraped_at': datetime.now(timezone.utc).isoformat()
        })

    driver.quit()
    return rows


def upload_to_supabase(rows: list[dict]):
    for row in rows:
        supabase.table('classroom_courses').insert(row).execute()

# -- 4) Main ------------------------------------------------------------------
if __name__ == '__main__':
    TERM = "2025 Fall"
    SUBJECT_CODES = [
       "APPL", "AAAD", "ACSM", "ADJU", "AERO", "AFAM", "AFRI", "AHEC", "AHSC", "AIRS", "AMST", "ANA", "ANAT", "ANES", "ANGL", "ANS", "ANSC", "ANTH", "APSM", "ARA", "ARAB", "ARCH", "ARGE", "ARMY", "AROT", "ART", "ARTH", "ARTS", "ASCI", "ASCM", "ASHV", "ASIA", "ASTR", "BACT", "BAE", "BBSP", "BCB", "BCH", "BCHM", "BCS", "BEIJ", "BENG", "BERL", "BIOC", "BIOL", "BIOM", "BIOS", "BIOX", "BMA", "BME", "BMME", "BOE", "BOIC", "BOLO", "BOT", "BOTN", "BRIS", "BSCI", "BUIS", "BULG", "BUSA", "BUSG", "BUSI", "BUSS", "CAPS", "CATA", "CBAM", "CBIO", "CBMC", "CBPH", "CDFS", "CE", "CELT", "CENG", "CEOM", "CERT", "CGL", "CHE", "CHEM", "CHER", "CHIN", "CHIP", "CHPM", "CHSC", "CITZ", "CLAR", "CLAS", "CLIC", "CLIT", "CLSC", "CLSK", "CLST", "CMPL", "COML", "COMM", "COMP", "COPE", "CORE", "COSI", "CPXM", "CRMH", "CS", "CYTO", "CZCH", "DATA", "DATE", "DDDD", "DECO", "DENG", "DENT", "DERM", "DESN", "DHED", "DHYG", "DNDG", "DNEC", "DNED", "DPET", "DPMP", "DPOP", "DPPE", "DRAM", "DTCH", "EAST", "EC", "ECOL", "ECON", "ED", "ED1C", "EDCI", "EDFO", "EDIN", "EDMX", "EDSP", "EDUC", "EDUX", "EE", "EENG", "EGR", "ELAW", "EMES", "ENDO", "ENEC", "ENGL", "ENGM", "ENGR", "ENST", "ENT", "ENUR", "ENVR", "EPID", "ERMD", "EURO", "EXSS", "EXTN", "FARE", "FES", "FMED", "FMME", "FOLK", "FOR", "FORE", "FORS", "FRED", "FREN", "FSCI", "GEN", "GEOG", "GEOL", "GERJ", "GERM", "GHAN", "GLBE", "GLBL", "GN", "GNE", "GNET", "GOTT", "GOVT", "GRAD", "GREK", "GSA", "GSLL", "HAD", "HADA", "HADM", "HAUS", "HBEH", "HBHE", "HCTS", "HDL", "HE", "HEBR", "HECO", "HEED", "HIND", "HIST", "HLTH", "HMSC", "HMST", "HMTS", "HNRS", "HNUR", "HOME", "HORT", "HPAA", "HPM", "HSCI", "HST", "HUNG", "HUSA", "HYGI", "IBMS", "ICMU", "ICRS", "ICSR", "IDST", "IENG", "IEP", "IHMS", "IIOC", "IMMU", "INDC", "INDO", "INDR", "INFO", "INLS", "INTI", "INTS", "ISO", "ISRA", "ITAL", "JAP", "JAPN", "JOMC", "JOUR", "JWST", "KANS", "KFM", "KOR", "LAQ", "LAR", "LARS", "LATN", "LAW", "LEED", "LFIT", "LGLA", "LIBS", "LIMA", "LING", "LOND", "LSA", "LSEC", "LSRA", "LSSM", "LTAM", "LVE", "LW", "LYON", "MA", "MAC", "MACD", "MACF", "MAE", "MAHP", "MANC", "MANS", "MASC", "MAT", "MATE", "MATH", "MAYA", "MBA", "MBIO", "MCHL", "MCRO", "MDPH", "MDSP", "MEDC", "MEDF", "MEDI", "MEDT", "MEEN", "MEJO", "MENG", "MENH", "MESE", "METR", "MEXI", "MHCH", "MIC", "MICR", "MILS", "MISC", "MNDG", "MNGT", "MODC", "MONT", "MOPH", "MOPL", "MPED", "MS", "MSBS", "MSCI", "MSMS", "MTEC", "MTSC", "MUSC", "MXCL", "MYCO", "NANZ", "NAVS", "NBIO", "NDSS", "NE", "NENG", "NEUR", "NEUS", "NORW", "NSCI", "NSP", "NT", "NURS", "NUSJ", "NUTR", "OBGN", "OBIO", "OCBM", "OCCT", "OCEN", "OCSC", "ODTP", "OMED", "OMSU", "OPER", "OPHT", "OR", "ORAD", "ORDI", "ORLN", "ORPA", "ORSA", "ORSU", "ORTH", "ORTS", "OTOL", "P-LI", "PACE", "PADM", "PADS", "PALP", "PARA", "PASC", "PATH", "PATY", "PEDI", "PEDO", "PEDS", "PERI", "PERS", "PERU", "PEW", "PHAD", "PHAR", "PHCG", "PHCH", "PHCO", "PHCY", "PHED", "PHIL", "PHPR", "PHRS", "PHS", "PHTH", "PHYA", "PHYE", "PHYI", "PHYS", "PHYT", "PHYY", "PLAN", "PLCY", "PLNT", "PLSH", "PLTM", "PMED", "PO", "POLI", "POLT", "PORT", "PP", "PPES", "PPOL", "PPS", "PREV", "PROD", "PROS", "PRSN", "PS", "PSNU", "PSY", "PSYC", "PSYI", "PSYS", "PSYY", "PUBA", "PUBH", "PUBP", "PUPA", "PVME", "PWAD", "PYSI", "QHCH", "RADG", "RADI", "RADY", "RECR", "REL", "RELI", "REST", "RFIX", "RHAB", "RLGE", "ROMA", "ROML", "RPSY", "RTVM", "RUES", "RUMA", "RUSS", "SADM", "SANS", "SCLL", "SECR", "SERB", "SEVI", "SIEN", "SLAV", "SNVR", "SOC", "SOCI", "SOCM", "SOIL", "SOMP", "SOWO", "SPAN", "SPCH", "SPCY", "SPHG", "SPHS", "SSAP", "SSC", "SSCI", "ST", "STA", "STAN", "STAT", "STOR", "SUOP", "SURG", "SURS", "SURY", "SUSS", "SWAH", "SWED", "TAML", "TEXT", "THER", "TOXC", "TOXI", "TREQ", "TRXN", "TUBI", "TURK", "UBDS", "UKRN", "UNI", "UNIV", "URES", "VET", "VIET", "WGST", "WMST", "WOLL", "WOLO", "YIDI", "YORU", "ZOOL"
    ]
    run_sql_file('clear_appended_tables.sql')
    for subj in SUBJECT_CODES:
        print(f'  • {subj}', end=' ... ')
        try:
            data = scrape_subject(TERM, subj)
            upload_to_supabase(data)
            print(f'Done ({len(data)} rows)')
        except Exception as e:
            print(f'Error: {e}')
    run_sql_file('update_free_slots.sql')

    print(' All tasks complete.')
