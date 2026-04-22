function mapBookRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    category: row.category,
    status: row.status,
    location: {
      floor: row.floor,
      section: row.section,
      shelf: row.shelf
    },
  };
}

export { mapBookRow };
