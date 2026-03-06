import os
import hashlib
from app.core.vector_store import vector_store
from app.core.config import settings


class IngestionService:

    DOCUMENT_FOLDER = "data/documents"

    # -----------------------------
    # REGISTERED DOCUMENT MAP
    # -----------------------------

    DOCUMENT_DEPARTMENT_MAP = {
        "finance_expense_policy.txt": ("Finance", "General"),
        "finance_salary_adjustment_protocol.txt": ("Finance", "Department"),
        "compliance_code_of_conduct.txt": ("Compliance", "General"),
        "compliance_internal_investigation_protocol.txt": ("Compliance", "Restricted"),
        "compliance_audit_operations_guide.txt": ("Compliance", "Department"),
        "employee_handbook_general.txt": ("HR", "General"),
        "it_systems_and_tools.txt": ("IT", "General"),
    }

    # -----------------------------
    # FILE HASH TRACKER
    # -----------------------------

    file_hash_cache = {}

    # -----------------------------
    # MAIN SYNC FUNCTION
    # -----------------------------

    def scan_and_sync_documents(self):

        print("🔍 Scanning documents...")

        processed = 0
        updated = 0
        skipped = 0

        for filename in os.listdir(self.DOCUMENT_FOLDER):

            if filename not in self.DOCUMENT_DEPARTMENT_MAP:
                print(f"\n⚠ SKIPPED: {filename}")
                print("Reason: Document is not registered in DOCUMENT_DEPARTMENT_MAP.")
                print("Action Required: Add this filename to DOCUMENT_DEPARTMENT_MAP in ingest_service.py\n")
                skipped += 1
                continue

            full_path = os.path.join(self.DOCUMENT_FOLDER, filename)

            file_hash = self._calculate_file_hash(full_path)

            if filename in self.file_hash_cache and self.file_hash_cache[filename] == file_hash:
                processed += 1
                continue  # No change

            department, access_scope = self.DOCUMENT_DEPARTMENT_MAP[filename]

            print(f"📄 Updating: {filename} ({department})")

            self._ingest_single_document(
                filepath=full_path,
                filename=filename,
                department=department,
                access_scope=access_scope
            )

            self.file_hash_cache[filename] = file_hash
            updated += 1
            processed += 1

        print("✅ Document sync complete.")
        print(f"Processed: {processed}")
        print(f"Updated: {updated}")
        print(f"Skipped: {skipped}")

    # -----------------------------
    # HASH FUNCTION
    # -----------------------------

    def _calculate_file_hash(self, filepath):
        with open(filepath, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()

    # -----------------------------
    # SMART PARAGRAPH CHUNKING
    # -----------------------------

    def _chunk_document(self, text):
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        return paragraphs

    # -----------------------------
    # SINGLE DOCUMENT INGEST
    # -----------------------------

    def _ingest_single_document(self, filepath, filename, department, access_scope):

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        chunks = self._chunk_document(content)

        ids = []
        documents = []
        metadatas = []

        for idx, chunk in enumerate(chunks):

            chunk_id = f"{filename}_chunk_{idx}"

            ids.append(chunk_id)
            documents.append(chunk)

            metadatas.append({
                "document_name": filename,
                "department": department,
                "access_scope": access_scope
            })


        vector_store.upsert_documents(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )


ingestion_service = IngestionService()