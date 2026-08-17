const PRIMARY_FIELD_KEYS = [
  'aspect_ratio', 'ratio', 'resolution', 'quality', 'duration',
  'size', 'image_size', 'n', 'count', 'image_count',
]

export function partitionCanvasFields(fields = []) {
  const prompt = fields.find((field) => ['prompt', 'input', 'text', 'query'].includes(field.key)) || null
  const order = new Map(PRIMARY_FIELD_KEYS.map((key, index) => [key, index]))
  const primary = fields
    .filter((field) => order.has(field.key))
    .sort((a, b) => order.get(a.key) - order.get(b.key))
    .slice(0, 5)
  const primaryKeys = new Set(primary.map((field) => field.key))

  return {
    prompt,
    primary,
    more: fields.filter((field) => field !== prompt && !primaryKeys.has(field.key)),
  }
}
