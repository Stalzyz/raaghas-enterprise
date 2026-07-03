import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../products/products.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private productService: ProductService
  ) {
  }

  async search(query: string) {
    const settings = await (this.prisma as any).storeSettings.findUnique({ where: { id: 'global' } });
    const apiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;

    // Always create a fresh client from the current key so admin updates take effect immediately
    const openaiClient = apiKey ? new OpenAI({ apiKey }) : null;

    if (!openaiClient) {
      // Fallback to standard DB search if no API key
      const productsResult = await this.productService.findAll({ search: query, limit: 12, adminMode: false });
      const products = Array.isArray(productsResult) ? productsResult : (productsResult as any).data;
      return {
        message: `I found these results for "${query}". (Note: Add an OpenAI API Key in the admin settings to unlock AI styling!)`,
        products: products
      };
    }

    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are an expert AI stylist for Raaghas, a premium fashion e-commerce brand specializing in luxury wear, kurtis, dresses, and traditional Indian clothing. Your goal is to interpret the user's query and extract search parameters to find the perfect products for them. If the user asks a conversational question, answer it warmly and elegantly in 1-2 short sentences, and ALWAYS call the search_products function to show them items.` },
          { role: 'user', content: query }
        ],
        functions: [
          {
            name: 'search_products',
            description: 'Search the product database using specific filters extracted from the user query.',
            parameters: {
              type: 'object',
              properties: {
                keywords: { type: 'string', description: 'General search terms, style, or product type (e.g. "kurti", "lehenga", "floral")' },
                category: { type: 'string', description: 'Product category if specified' },
                color: { type: 'string', description: 'Dominant color requested' },
                material: { type: 'string', description: 'Fabric or material (e.g. "silk", "cotton")' },
                occasion: { type: 'string', description: 'Occasion (e.g. "wedding", "casual", "festive")' },
                maxPrice: { type: 'number', description: 'Maximum price if the user mentions a budget' }
              }
            }
          }
        ],
        function_call: { name: 'search_products' }
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.function_call && responseMessage.function_call.name === 'search_products') {
        const args = JSON.parse(responseMessage.function_call.arguments);
        
        // Build the query
        const searchQuery: any = { limit: 12, adminMode: false, inStock: true };
        
        // Combine keywords, color, material into a single search string for simplicity, or use specific fields if they exist
        const searchTerms: string[] = [];
        if (args.keywords) searchTerms.push(args.keywords);
        if (args.color) searchTerms.push(args.color);
        if (args.material) searchTerms.push(args.material);
        if (args.occasion) searchTerms.push(args.occasion);
        
        if (searchTerms.length > 0) {
          searchQuery.search = searchTerms.join(' ');
        }
        
        if (args.category) searchQuery.type = args.category;
        if (args.maxPrice) searchQuery.maxPrice = args.maxPrice;

        const productsResult = await this.productService.findAll(searchQuery);
        const products = Array.isArray(productsResult) ? productsResult : (productsResult as any).data;

        // If AI didn't provide a conversational message, generate one based on results
        let finalMessage = responseMessage.content;
        if (!finalMessage) {
           if (products.length > 0) {
              finalMessage = `Here are some beautiful options I found for you!`;
           } else {
              finalMessage = `I'm sorry, I couldn't find exactly what you're looking for right now.`;
           }
        }

        return {
          message: finalMessage,
          products: products
        };
      } else {
        // If it didn't call the function, just return the chat message
        return {
          message: responseMessage.content || "I can help you find the perfect outfit. What are you looking for?",
          products: []
        };
      }
    } catch (error) {
      this.logger.error('OpenAI Search Error', error);
      // Fallback
      const productsResult = await this.productService.findAll({ search: query, limit: 12, adminMode: false });
      const products = Array.isArray(productsResult) ? productsResult : (productsResult as any).data;
      return {
        message: `Here are some results for "${query}".`,
        products: products
      };
    }
  }
}
