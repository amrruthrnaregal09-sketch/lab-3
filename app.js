const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'books.db');
let db = null;

const allowedSortColumns = ['book_id', 'title', 'author', 'price'];

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        book_id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price REAL NOT NULL
      );
    `);

    const count = await db.get('SELECT COUNT(*) AS count FROM books');
    if (count.count === 0) {
      await db.run(
        `INSERT INTO books (title, author, price) VALUES
        (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)`,
        'The Alchemist', 'Paulo Coelho', 299,
        'Wings of Fire', 'A. P. J. Abdul Kalam', 250,
        'Atomic Habits', 'James Clear', 450,
        'Ikigai', 'Hector Garcia', 320,
        'Deep Work', 'Cal Newport', 399
      );
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to initialize database or server:', error.message);
    process.exit(1);
  }
};

// GET /books?search_q=...&order_by=title&order=ASC&limit=10&offset=0&min_price=100&max_price=500
app.get('/books', async (req, res) => {
  try {
    const {
      search_q = '',
      order_by = 'book_id',
      order = 'ASC',
      limit = '10',
      offset = '0',
      min_price,
      max_price
    } = req.query;

    const sortColumn = allowedSortColumns.includes(order_by) ? order_by : 'book_id';
    const sortOrder = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const pageLimit = Number.parseInt(limit, 10);
    const pageOffset = Number.parseInt(offset, 10);

    if (!Number.isInteger(pageLimit) || pageLimit < 1 ||
        !Number.isInteger(pageOffset) || pageOffset < 0) {
      return res.status(400).json({ message: 'limit must be positive and offset must be zero or greater.' });
    }

    const conditions = [];
    const params = [];

    if (search_q.trim() !== '') {
      conditions.push('title LIKE ?');
      params.push(`%${search_q.trim()}%`);
    }

    if (min_price !== undefined) {
      const min = Number(min_price);
      if (!Number.isFinite(min)) {
        return res.status(400).json({ message: 'min_price must be a number.' });
      }
      conditions.push('price >= ?');
      params.push(min);
    }

    if (max_price !== undefined) {
      const max = Number(max_price);
      if (!Number.isFinite(max)) {
        return res.status(400).json({ message: 'max_price must be a number.' });
      }
      conditions.push('price <= ?');
      params.push(max);
    }

    if (min_price !== undefined && max_price !== undefined &&
        Number(min_price) > Number(max_price)) {
      return res.status(400).json({ message: 'min_price cannot be greater than max_price.' });
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM books
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?;
    `;
    params.push(pageLimit, pageOffset);

    const books = await db.all(sql, params);
    return res.status(200).json(books);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch books.', error: error.message });
  }
});

// GET /books/:bookId
app.get('/books/:bookId', async (req, res) => {
  try {
    const book = await db.get(
      'SELECT * FROM books WHERE book_id = ?',
      [req.params.bookId]
    );
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    return res.status(200).json(book);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch book.' });
  }
});

// POST /books
app.post('/books', async (req, res) => {
  try {
    const { title, author, price } = req.body;

    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ message: 'title is required and must be a non-empty string.' });
    }
    if (typeof author !== 'string' || author.trim() === '') {
      return res.status(400).json({ message: 'author is required and must be a non-empty string.' });
    }
    if (price === undefined || price === null || price === '' || !Number.isFinite(Number(price))) {
      return res.status(400).json({ message: 'price is required and must be a number.' });
    }
    if (Number(price) < 0) {
      return res.status(400).json({ message: 'price cannot be negative.' });
    }

    const result = await db.run(
      'INSERT INTO books (title, author, price) VALUES (?, ?, ?)',
      [title.trim(), author.trim(), Number(price)]
    );
    const newBook = await db.get('SELECT * FROM books WHERE book_id = ?', [result.lastID]);
    return res.status(201).json({ message: 'Book created successfully.', book: newBook });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create book.' });
  }
});

// PUT /books/:bookId
app.put('/books/:bookId', async (req, res) => {
  try {
    const { title, author, price } = req.body;
    if (typeof title !== 'string' || title.trim() === '' ||
        typeof author !== 'string' || author.trim() === '' ||
        price === undefined || price === null || price === '' ||
        !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: 'Provide valid title, author and non-negative numeric price.' });
    }

    const existing = await db.get('SELECT * FROM books WHERE book_id = ?', [req.params.bookId]);
    if (!existing) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    await db.run(
      'UPDATE books SET title = ?, author = ?, price = ? WHERE book_id = ?',
      [title.trim(), author.trim(), Number(price), req.params.bookId]
    );
    const updatedBook = await db.get('SELECT * FROM books WHERE book_id = ?', [req.params.bookId]);
    return res.status(200).json({ message: 'Book updated successfully.', book: updatedBook });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update book.' });
  }
});

// DELETE /books/:bookId
app.delete('/books/:bookId', async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM books WHERE book_id = ?', [req.params.bookId]);
    if (!existing) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    await db.run('DELETE FROM books WHERE book_id = ?', [req.params.bookId]);
    return res.status(200).json({ message: 'Book deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete book.' });
  }
});

initializeDBAndServer();
