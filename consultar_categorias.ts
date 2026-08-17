import { db } from './src/lib/db.ts'

async function main() {
  const { data, error } = await db
    .from('categorias')
    .select('slug, nombre')
    .order('id')

  if (error) {
    console.error('ERROR DE SUPABASE:', JSON.stringify(error, null, 2))
    process.exit(1)
  }

  console.log('CATEGORÍAS:', JSON.stringify(data, null, 2))
}

main().catch((err) => {
  console.error('EXCEPCIÓN:', err)
  process.exit(1)
})
