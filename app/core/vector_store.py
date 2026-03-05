import chromadb


class VectorStore:

    def __init__(self):

        self.client = chromadb.PersistentClient(
            path="data/vector_store"
        )

        self.collection = self.client.get_or_create_collection(
            name="honey_ai_onboard"
        )

    def upsert_documents(self, ids, documents, embeddings, metadatas):

        self.collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

    def query(self, query_text, top_k=6):

        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k
        )

        return results


vector_store = VectorStore()