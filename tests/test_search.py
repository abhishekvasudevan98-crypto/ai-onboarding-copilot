from app.services.search_service import search_service

query = "What is the deadline for submitting expense reports?"

result = search_service.search(query)

print(result)