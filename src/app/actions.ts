'use server';

import prisma from '@/lib/prisma';

// Fetch the love letter message text
export async function fetchLetterMessage(): Promise<string> {
  try {
    const data = await prisma.letter_content.findFirst();
    return data?.message || "Couldn't read message. Make sure Database is set up.";
  } catch (err) {
    console.error("Prisma error fetching letter message:", err);
    return "Failed to load message.";
  }
}

// Fetch all images for the carousel ordered by sort_order
export interface CarouselImageResult {
  id: number;
  image_url: string;
  sort_order: number | null;
}

export async function fetchCarouselImages(): Promise<CarouselImageResult[]> {
  try {
    const data = await prisma.carousel_images.findMany({
      orderBy: {
        sort_order: 'asc',
      },
    });
    return data;
  } catch (err) {
    console.error("Prisma error fetching carousel images:", err);
    return [];
  }
}

// Fetch active layout setting (defaults to 3, since app_settings table might not exist yet)
export async function fetchActiveLayout(): Promise<number> {
  try {
    // Check if app_settings exists. If not, default to layout 3
    // Since prisma schema doesn't have it, we default to 3.
    return 3; 
  } catch (e) {
    console.warn("Fallback to Layout 3.", e);
    return 3;
  }
}

// Save a site visit or button interaction log
export async function saveActivityLog(eventName: string, pageUrl: string): Promise<void> {
  try {
    await prisma.activity_logs.create({
      data: {
        event_name: eventName,
        page_url: pageUrl,
      },
    });
  } catch (err) {
    console.error("Prisma error creating activity log:", err);
  }
}

// Fetch the background music URL
export async function fetchBgMusic(): Promise<string> {
  try {
    const data = await prisma.bg_music.findFirst();
    return data?.music_url || '';
  } catch (err) {
    console.error("Prisma error fetching bg music:", err);
    return '';
  }
}
