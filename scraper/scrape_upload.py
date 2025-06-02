from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from bs4 import BeautifulSoup, Tag
import os
import time
from dotenv import load_dotenv
from datetime import datetime, timezone
from supabase import create_client, Client

# ====== 1) Load environment and initialize Supabase client ======
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ====== 2) Scraper Function ======
def scrape_subject(term: str, subject_code: str):
    """
    Scrapes UNC's class-search for a given term + subject_code.
    Returns a list of dicts:
      {
        "catalog_number": <text>,
        "schedule":       <text>,
        "room":           <text>,
        "scraped_at":     <ISO timestamp>
      }
    """
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(service=Service(), options=chrome_options)
    driver.set_page_load_timeout(30)
    driver.get("https://reports.unc.edu/class-search/")

    # 1) Input Term
    term_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.NAME, "term"))
    )
    term_input.clear()
    term_input.send_keys(term)

    # 2) Input Subject Code
    subject_input = driver.find_element(By.NAME, "subject")
    subject_input.clear()
    subject_input.send_keys(subject_code)

    # 3) Click Search
    search_button = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.ID, "filter-submit"))
    )
    search_button.click()

    # 4) Wait for <table> to appear
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//table"))
    )

    # 5) Scroll several times to force all rows to load
    for _ in range(5):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1.5)

    # 6) Parse HTML with BeautifulSoup
    soup = BeautifulSoup(driver.page_source, "html.parser")
    table = soup.find("table")
    if table is None:
        driver.quit()
        return []  # No results for this subject

    # 7) Count header columns (should be 14)
    header_cells = [th.get_text(strip=True) for th in table.find("tr").find_all("th")]
    expected_columns = len(header_cells)  # e.g., 14

    # 8) Fixed indexes for needed columns:
    #    [0] Subject           [1] Catalog Number   [2] Same As
    #    [3] Class Section     [4] Class Number    [5] Description
    #    [6] Term              [7] Hours           [8] Meeting Dates
    #   [9] Schedule         [10] Room           [11] Instruction Type
    #   [12] Instructor      [13] Available Seats
    idx_catalog_number = 1
    idx_schedule       = 9
    idx_room           = 10

    rows = []
    last_catalog_number = ""  # Carry-forward variable

    # 9) Iterate over every data <tr> (skip header row)
    for tr in table.find_all("tr")[1:]:
        tds = tr.find_all("td")

        # a) If this row has fewer than expected_columns, pad at front:
        if len(tds) < expected_columns:
            missing = expected_columns - len(tds)
            tds = [None] * missing + tds

        # b) If it still doesn’t match expected_columns exactly, skip as malformed:
        if len(tds) != expected_columns:
            continue

        # 10) “Carry forward” Catalog Number if tds[1] is blank or None
        raw_catnum = ""
        if isinstance(tds[idx_catalog_number], Tag):
            raw_catnum = tds[idx_catalog_number].get_text(strip=True)
        if raw_catnum:
            last_catalog_number = raw_catnum

        # 11) Extract Schedule & Room from fixed indexes
        schedule_text = ""
        if isinstance(tds[idx_schedule], Tag):
            schedule_text = tds[idx_schedule].get_text(strip=True)

        room_text = ""
        if isinstance(tds[idx_room], Tag):
            room_text = tds[idx_room].get_text(strip=True)

        rows.append({
            "catalog_number": last_catalog_number,
            "schedule":       schedule_text,
            "room":           room_text,
            "scraped_at":     datetime.now(timezone.utc).isoformat()
        })

    driver.quit()
    return rows

# ====== 3) Upload to Supabase ======
def upload_to_supabase(rows):
    """
    Insert each row into Supabase table “classroom_courses”.
    Table schema must have columns:
      - id (uuid default uuid_generate_v4())
      - catalog_number (text)
      - schedule       (text)
      - room           (text)
      - scraped_at     (timestamptz)
    """
    for row in rows:
        supabase.table("classroom_courses").insert(row).execute()

# ====== 4) Main Execution Block ======
if __name__ == "__main__":
    term = "2025 Fall"

    subject_codes = [
       "APPL", "AAAD", "ACSM", "ADJU", "AERO", "AFAM", "AFRI", "AHEC", "AHSC", "AIRS", "AMST", "ANA", "ANAT", "ANES", "ANGL", "ANS", "ANSC", "ANTH", "APSM", "ARA", "ARAB", "ARCH", "ARGE", "ARMY", "AROT", "ART", "ARTH", "ARTS", "ASCI", "ASCM", "ASHV", "ASIA", "ASTR", "BACT", "BAE", "BBSP", "BCB", "BCH", "BCHM", "BCS", "BEIJ", "BENG", "BERL", "BIOC", "BIOL", "BIOM", "BIOS", "BIOX", "BMA", "BME", "BMME", "BOE", "BOIC", "BOLO", "BOT", "BOTN", "BRIS", "BSCI", "BUIS", "BULG", "BUSA", "BUSG", "BUSI", "BUSS", "CAPS", "CATA", "CBAM", "CBIO", "CBMC", "CBPH", "CDFS", "CE", "CELT", "CENG", "CEOM", "CERT", "CGL", "CHE", "CHEM", "CHER", "CHIN", "CHIP", "CHPM", "CHSC", "CITZ", "CLAR", "CLAS", "CLIC", "CLIT", "CLSC", "CLSK", "CLST", "CMPL", "COML", "COMM", "COMP", "COPE", "CORE", "COSI", "CPXM", "CRMH", "CS", "CYTO", "CZCH", "DATA", "DATE", "DDDD", "DECO", "DENG", "DENT", "DERM", "DESN", "DHED", "DHYG", "DNDG", "DNEC", "DNED", "DPET", "DPMP", "DPOP", "DPPE", "DRAM", "DTCH", "EAST", "EC", "ECOL", "ECON", "ED", "ED1C", "EDCI", "EDFO", "EDIN", "EDMX", "EDSP", "EDUC", "EDUX", "EE", "EENG", "EGR", "ELAW", "EMES", "ENDO", "ENEC", "ENGL", "ENGM", "ENGR", "ENST", "ENT", "ENUR", "ENVR", "EPID", "ERMD", "EURO", "EXSS", "EXTN", "FARE", "FES", "FMED", "FMME", "FOLK", "FOR", "FORE", "FORS", "FRED", "FREN", "FSCI", "GEN", "GEOG", "GEOL", "GERJ", "GERM", "GHAN", "GLBE", "GLBL", "GN", "GNE", "GNET", "GOTT", "GOVT", "GRAD", "GREK", "GSA", "GSLL", "HAD", "HADA", "HADM", "HAUS", "HBEH", "HBHE", "HCTS", "HDL", "HE", "HEBR", "HECO", "HEED", "HIND", "HIST", "HLTH", "HMSC", "HMST", "HMTS", "HNRS", "HNUR", "HOME", "HORT", "HPAA", "HPM", "HSCI", "HST", "HUNG", "HUSA", "HYGI", "IBMS", "ICMU", "ICRS", "ICSR", "IDST", "IENG", "IEP", "IHMS", "IIOC", "IMMU", "INDC", "INDO", "INDR", "INFO", "INLS", "INTI", "INTS", "ISO", "ISRA", "ITAL", "JAP", "JAPN", "JOMC", "JOUR", "JWST", "KANS", "KFM", "KOR", "LAQ", "LAR", "LARS", "LATN", "LAW", "LEED", "LFIT", "LGLA", "LIBS", "LIMA", "LING", "LOND", "LSA", "LSEC", "LSRA", "LSSM", "LTAM", "LVE", "LW", "LYON", "MA", "MAC", "MACD", "MACF", "MAE", "MAHP", "MANC", "MANS", "MASC", "MAT", "MATE", "MATH", "MAYA", "MBA", "MBIO", "MCHL", "MCRO", "MDPH", "MDSP", "MEDC", "MEDF", "MEDI", "MEDT", "MEEN", "MEJO", "MENG", "MENH", "MESE", "METR", "MEXI", "MHCH", "MIC", "MICR", "MILS", "MISC", "MNDG", "MNGT", "MODC", "MONT", "MOPH", "MOPL", "MPED", "MS", "MSBS", "MSCI", "MSMS", "MTEC", "MTSC", "MUSC", "MXCL", "MYCO", "NANZ", "NAVS", "NBIO", "NDSS", "NE", "NENG", "NEUR", "NEUS", "NORW", "NSCI", "NSP", "NT", "NURS", "NUSJ", "NUTR", "OBGN", "OBIO", "OCBM", "OCCT", "OCEN", "OCSC", "ODTP", "OMED", "OMSU", "OPER", "OPHT", "OR", "ORAD", "ORDI", "ORLN", "ORPA", "ORSA", "ORSU", "ORTH", "ORTS", "OTOL", "P-LI", "PACE", "PADM", "PADS", "PALP", "PARA", "PASC", "PATH", "PATY", "PEDI", "PEDO", "PEDS", "PERI", "PERS", "PERU", "PEW", "PHAD", "PHAR", "PHCG", "PHCH", "PHCO", "PHCY", "PHED", "PHIL", "PHPR", "PHRS", "PHS", "PHTH", "PHYA", "PHYE", "PHYI", "PHYS", "PHYT", "PHYY", "PLAN", "PLCY", "PLNT", "PLSH", "PLTM", "PMED", "PO", "POLI", "POLT", "PORT", "PP", "PPES", "PPOL", "PPS", "PREV", "PROD", "PROS", "PRSN", "PS", "PSNU", "PSY", "PSYC", "PSYI", "PSYS", "PSYY", "PUBA", "PUBH", "PUBP", "PUPA", "PVME", "PWAD", "PYSI", "QHCH", "RADG", "RADI", "RADY", "RECR", "REL", "RELI", "REST", "RFIX", "RHAB", "RLGE", "ROMA", "ROML", "RPSY", "RTVM", "RUES", "RUMA", "RUSS", "SADM", "SANS", "SCLL", "SECR", "SERB", "SEVI", "SIEN", "SLAV", "SNVR", "SOC", "SOCI", "SOCM", "SOIL", "SOMP", "SOWO", "SPAN", "SPCH", "SPCY", "SPHG", "SPHS", "SSAP", "SSC", "SSCI", "ST", "STA", "STAN", "STAT", "STOR", "SUOP", "SURG", "SURS", "SURY", "SUSS", "SWAH", "SWED", "TAML", "TEXT", "THER", "TOXC", "TOXI", "TREQ", "TRXN", "TUBI", "TURK", "UBDS", "UKRN", "UNI", "UNIV", "URES", "VET", "VIET", "WGST", "WMST", "WOLL", "WOLO", "YIDI", "YORU", "ZOOL"
    ]

    for subj in subject_codes:
        print(f"Scraping {subj} for {term}…")
        try:
            result_rows = scrape_subject(term, subj)
            print(f"  → Found {len(result_rows)} rows.")
            upload_to_supabase(result_rows)
        except Exception as exc:
            print(f"  ✖ Failed on {subj}: {exc}")

    print("✅ All subjects complete.")
