let handler = async (m, { conn }) => {
  await conn.sendTable(
    m.chat,
    '',
    ['Columna 1', 'Columna 2'],
    [
      ['Fila 1', 'Fila 2']
    ],
    m,
    {
      headerText: 'Title',
      footer: 'Pie'
    }
  )
}

handler.command = ['tabla']

export default handler
