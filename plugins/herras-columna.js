let handler = async (m, { conn }) => {
  await conn.sendTable(
    m.chat,
    '',
    ['owner 1', 'owner 2'],
    [
      ['yosue', 'ado']
    ],
    m,
    {
      headerText: 'Title',
      footer: 'canal:https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O'
    }
  )
}

handler.command = ['tabla']

export default handler
