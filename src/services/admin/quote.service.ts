
import { prisma } from '../../lib/prisma';
import { MoodType } from '@prisma/client';

export interface CreateQuoteDto {
    text: string;
    author?: string;
    mood: MoodType;
}

export const quoteService = {
    /**
     * Create a new quote linked to a specific mood
     */
    async createQuote(data: CreateQuoteDto) {
        return prisma.quote.create({
            data: {
                text: data.text,
                author: data.author,
                mood: data.mood,
            },
        });
    },

    /**
     * Get all quotes, optionally filtered by mood
     */
    async getQuotes(mood?: MoodType) {
        if (mood) {
            return prisma.quote.findMany({
                where: { mood },
                orderBy: { createdAt: 'desc' },
            });
        }
        return prisma.quote.findMany({
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Delete a quote by ID
     */
    async deleteQuote(id: string) {
        return prisma.quote.delete({
            where: { id },
        });
    },

    /**
     * Get a random quote for a specific mood
     */
    async getRandomQuote(mood: MoodType) {
        const quotes = await prisma.quote.findMany({
            where: { mood },
        });

        if (quotes.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    },
};
