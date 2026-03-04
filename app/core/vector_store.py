import chromadb
from chromadb.config import Settings
from app.core.embeddings import EmbeddingModel


class VectorStore:

    def __init__(self):
        self.client = chromadb.Client(
            Settings(persist_directory="vector_store")
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

        embedding = EmbeddingModel.get_instance().embed_query(query_text)

        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=top_k
        )

        return results


vector_store = VectorStore()