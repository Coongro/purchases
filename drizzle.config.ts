import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/schema/supplier.ts', './src/schema/purchase.ts', './src/schema/purchase-line.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});
