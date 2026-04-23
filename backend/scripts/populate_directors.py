import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
db = MongoClient(os.getenv('MONGO_URL'))[os.getenv('DATABASE_NAME')]

movies = list(db.movies.find({"wiki_summary": {"$exists": True, "$ne": None}}))

count = 0
for m in movies:
    summary = m['wiki_summary']
    match = re.search(r'directed by ([A-Z][a-z]+(?: [A-Z][a-z]+)?)', summary)
    if match:
        director = match.group(1).strip()
        db.movies.update_one({'_id': m['_id']}, {'$set': {'wiki_director': director}})
        count += 1
        
print(f"Successfully populated {count} directors.")
