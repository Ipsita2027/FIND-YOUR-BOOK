function mapBookRow(row) {
  const callNumber = row.callNumber ?? row.call_number;

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
      shelf: row.shelf,
      callNumber
    },
  };
}

export { mapBookRow };
