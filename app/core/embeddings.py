from sentence_transformers import SentenceTransformer


class EmbeddingModel:

    _instance = None

    def __init__(self):
        # lighter embedding model for low-memory environments
        self.model = SentenceTransformer("paraphrase-MiniLM-L3-v2")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = EmbeddingModel()
        return cls._instance

    def embed_documents(self, documents):
        return self.model.encode(documents).tolist()

    def embed_query(self, query):
        return self.model.encode([query]).tolist()[0]