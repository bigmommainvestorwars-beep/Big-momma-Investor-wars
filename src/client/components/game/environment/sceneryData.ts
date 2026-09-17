export interface SceneryPreset {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  description: string;
  skyscrapers: string;
  trees: string;
  lightingMood: 'Dusk' | 'Golden Hour' | 'Twilight' | 'Daylight';
  badge: string;
}

export const SCENERY_PRESETS: SceneryPreset[] = [
  {
    id: 'central-park-skyscrapers',
    name: 'Central Park High-Rises & Green Canopy',
    subtitle: 'Towering Glass Skyscrapers Rising Above Lush Urban Trees',
    imageUrl: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=2560&q=90',
    description: 'High-definition panoramic view of supertall glass and steel financial towers rising sharply behind the vibrant emerald foliage of park trees surrounding the circular game arena.',
    skyscrapers: 'Supertall glass & steel towers with illuminated facades',
    trees: 'Dense green oak & maple canopies framing the perimeter',
    lightingMood: 'Golden Hour',
    badge: '4K Ultra HD',
  },
  {
    id: 'financial-plaza-gardens',
    name: 'Metropolitan Financial Plaza & Gardens',
    subtitle: 'Contemporary Corporate Headquarters Framed by Botanical Walkways',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2560&q=90',
    description: 'Crisp architectural perspective of soaring commercial skyscrapers flanked by landscaped boulevard trees and modern pedestrian plazas.',
    skyscrapers: 'Futuristic corporate monoliths with reflective blue glass',
    trees: 'Manicured urban promenade trees & landscaped terraces',
    lightingMood: 'Daylight',
    badge: 'Retina HD',
  },
];
