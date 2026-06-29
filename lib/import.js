import Helper from './helper.js'

export default async function importFile(file) {
  const module_ = await import(`${file}?id=${Date.now()}`)
  const result = module_ && 'default' in module_ ? module_.default : module_
  return result
}
