import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
db = MongoClient(os.getenv('MONGO_URL'))[os.getenv('DATABASE_NAME')]

movies = list(db.movies.find({"wiki_summary": {"$exists": True, "$ne": None}}))
dirs = []

for m in movies:
    summary = m['wiki_summary']
    # Example: "is a 2024 American epic space opera film co-produced and directed by Denis Villeneuve"
    # Example: "is a 2023 American biographical thriller film written and directed by Christopher Nolan"
    match = re.search(r'directed by ([A-Z][a-z]+(?: [A-Z][a-z]+)?)', summary)
    if match:
        dirs.append(match.group(1))

from collections import Counter
print(Counter(dirs).most_common(15))
