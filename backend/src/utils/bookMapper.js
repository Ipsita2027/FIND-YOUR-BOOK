function mapBookRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    category: row.category,
    location: {
      floor: row.floor,
      section: row.section,
      shelf: row.shelf,
      callNumber: row.call_number
    },
  };
}

export { mapBookRow };
