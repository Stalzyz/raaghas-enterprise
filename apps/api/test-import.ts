import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ProductService } from './src/products/products.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productService = app.get(ProductService);
  
  const buffer = fs.readFileSync('/Users/stalinkumar/Desktop/Test_product.csv');
  const result = await productService.processCsvBulkUpload(buffer);
  console.log(JSON.stringify(result, null, 2));
  
  await app.close();
}
bootstrap().catch(console.error);
