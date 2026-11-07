# Lab 3: REST API, query parameters, validation, debugging

**Name:** Enter your name  
**Registration number:** Enter your registration number  
**Section:** Enter your section  

**Live link:** Not deployed yet

## How to run

1. Install Node.js (LTS).
2. Open this folder in VS Code or a terminal.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000/books` in a browser or Postman.

The application creates `books.db` and the `books` table automatically on first run. The default port is `3000`. To use another port, set the `PORT` environment variable.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/books` | List books with search, sorting, pagination and price filters |
| GET | `/books/:bookId` | Get one book |
| POST | `/books` | Create a book |
| PUT | `/books/:bookId` | Update a book |
| DELETE | `/books/:bookId` | Delete a book |

### GET /books query parameters

- `search_q`: partial title search
- `order_by`: `book_id`, `title`, `author` or `price`
- `order`: `ASC` or `DESC`
- `limit`: number of records (default `10`)
- `offset`: number of records to skip (default `0`)
- `min_price`: minimum price
- `max_price`: maximum price

Example:

`GET http://localhost:3000/books?search_q=the&order_by=price&order=DESC&limit=5&offset=0&min_price=100&max_price=500`

## Postman tests

Import or copy the requests from `tests/requests.http`. Test both valid and invalid inputs. Expected status codes: 200 for successful reads/updates/deletes, 201 for create, 400 for invalid input and 404 for a missing book.

## Screenshots

Save your own Postman screenshots in this folder and add them here. Do not submit placeholder screenshots as proof of a working server.

## Debugging notes

- `EADDRINUSE`: another process is using the port. Stop that process or run the app on another port.
- `Cannot find module`: check the import path and file name.
- `no such table`: verify the database path and table name.
- Missing database result: make sure the database operation uses `await`.

## Problems faced and solutions

Add the errors you encountered and how you fixed them.

## Safety and submission

- Do not commit `.env`, passwords or `node_modules`.
- Use parameterized SQL queries for user-provided values.
- Commit your work regularly with meaningful messages.
- Put this folder in `lab-03/` in your course GitHub repository and share the repository with your faculty.
