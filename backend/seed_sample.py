# backend/seed_sample.py
from models import init_db
from ingest import ingest_sample

if __name__ == "__main__":
    init_db()
    ingest_sample("demo", "sample_data.json")
    print("Sample data seeded into globalinsights.db")
