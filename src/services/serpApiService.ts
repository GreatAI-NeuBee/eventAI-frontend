/**
 * SerpAPI Service
 * Handles Google Search queries via SerpAPI
 */

const SERP_API_KEY = import.meta.env.VITE_SERP_API_KEY;
const SERP_API_BASE_URL = 'https://serpapi.com/search.json';

export interface SerpApiSearchParams {
  q: string; // Search query
  location?: string; // Location for search
  gl?: string; // Country code (e.g., 'my' for Malaysia)
  hl?: string; // Language (e.g., 'en' for English)
  num?: number; // Number of results
}

export interface SerpApiAIOverviewTextBlock {
  type: 'heading' | 'paragraph' | 'list' | 'expandable' | 'comparison' | 'table';
  snippet?: string;
  snippet_highlighted_words?: string[];
  reference_indexes?: number[];
  thumbnail?: string;
  list?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    reference_indexes?: number[];
    thumbnail?: string;
  }>;
  table?: string[][];
}

export interface SerpApiAIOverview {
  page_token?: string;
  serpapi_link?: string;
  text_blocks?: SerpApiAIOverviewTextBlock[];
  thumbnail?: string;
  references?: Array<{
    title: string;
    link: string;
    snippet?: string;
    source?: string;
    index: number;
  }>;
  error?: string;
}

export interface SerpApiOrganicResult {
  position: number;
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
  snippet_highlighted_words?: string[];
  date?: string;
  cached_page_link?: string;
  related_pages_link?: string;
  source?: string;
}

export interface SerpApiEventsResult {
  title: string;
  date: {
    start_date: string;
    when: string;
  };
  address?: string[];
  link?: string;
  event_location_map?: {
    image: string;
    link: string;
    serpapi_link: string;
  };
  description?: string;
  ticket_info?: Array<{
    source: string;
    link: string;
    link_type: string;
  }>;
  venue?: string;
  thumbnail?: string;
}

export interface SerpApiSearchResponse {
  search_metadata?: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  search_parameters?: {
    engine: string;
    q: string;
    location_requested?: string;
    location_used?: string;
    google_domain?: string;
    hl?: string;
    gl?: string;
    device?: string;
  };
  search_information?: {
    query_displayed: string;
    total_results: number;
    time_taken_displayed: number;
  };
  ai_overview?: SerpApiAIOverview;
  organic_results?: SerpApiOrganicResult[];
  events_results?: SerpApiEventsResult[];
  related_searches?: Array<{
    query: string;
    link: string;
  }>;
  error?: string;
}

/**
 * Search Google via SerpAPI
 */
export async function searchGoogle(params: SerpApiSearchParams): Promise<SerpApiSearchResponse> {
  try {
    console.log('🚀 [SerpAPI] Starting search request...');
    console.log('🔑 [SerpAPI] API Key exists:', !!SERP_API_KEY);
    console.log('🔑 [SerpAPI] API Key length:', SERP_API_KEY?.length);
    console.log('🔑 [SerpAPI] API Key preview:', SERP_API_KEY?.substring(0, 10) + '...');
    
    if (!SERP_API_KEY) {
      throw new Error('SERP_API_KEY is not configured in environment variables');
    }

    const searchParams = new URLSearchParams({
      api_key: SERP_API_KEY,
      engine: 'google',
      q: params.q,
      ...(params.location && { location: params.location }),
      ...(params.gl && { gl: params.gl }),
      ...(params.hl && { hl: params.hl }),
      ...(params.num && { num: params.num.toString() }),
    });

    const serpUrl = `${SERP_API_BASE_URL}?${searchParams.toString()}`;
    
    // Use CORS proxy to bypass browser CORS restrictions
    // SerpAPI doesn't support direct browser requests
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(serpUrl)}`;
    
    console.log('📤 [SerpAPI] Request Details:', {
      baseUrl: SERP_API_BASE_URL,
      query: params.q,
      location: params.location,
      gl: params.gl,
      hl: params.hl,
      num: params.num,
      serpUrl: serpUrl.replace(SERP_API_KEY, '***REDACTED***'),
      corsProxyUrl: corsProxyUrl.substring(0, 100) + '...',
    });

    console.log('⏳ [SerpAPI] Sending fetch request through CORS proxy...');
    const response = await fetch(corsProxyUrl);
    
    console.log('📥 [SerpAPI] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SerpAPI] Error Response Body:', errorText);
      console.error('❌ [SerpAPI] Error Response Status:', response.status);
      throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}\nBody: ${errorText}`);
    }

    const rawText = await response.text();
    console.log('📦 [SerpAPI] Raw Response Text (first 500 chars):', rawText.substring(0, 500));
    
    let data: SerpApiSearchResponse;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('❌ [SerpAPI] Failed to parse JSON response:', parseError);
      console.error('❌ [SerpAPI] Raw text:', rawText);
      throw new Error('Failed to parse SerpAPI response as JSON');
    }
    
    console.log('✅ [SerpAPI] Parsed Response Data:', data);
    console.log('✅ [SerpAPI] Response Keys:', Object.keys(data));
    console.log('✅ [SerpAPI] Response Summary:', {
      hasSearchMetadata: !!data.search_metadata,
      searchId: data.search_metadata?.id,
      hasAiOverview: !!data.ai_overview,
      aiOverviewError: data.ai_overview?.error,
      organicResultsCount: data.organic_results?.length || 0,
      eventsResultsCount: data.events_results?.length || 0,
      relatedSearchesCount: data.related_searches?.length || 0,
      totalResults: data.search_information?.total_results || 0,
      queryDisplayed: data.search_parameters?.q,
      error: data.error,
    });

    if (data.ai_overview) {
      console.log('🤖 [SerpAPI] AI Overview Details:', {
        hasPageToken: !!data.ai_overview.page_token,
        hasTextBlocks: !!data.ai_overview.text_blocks,
        textBlocksCount: data.ai_overview.text_blocks?.length || 0,
        referencesCount: data.ai_overview.references?.length || 0,
        error: data.ai_overview.error,
      });
    }

    if (data.events_results) {
      console.log('📅 [SerpAPI] Events Results:', data.events_results);
    }

    if (data.organic_results) {
      console.log('🌐 [SerpAPI] First 3 Organic Results:', data.organic_results.slice(0, 3));
    }

    return data;
  } catch (error) {
    console.error('❌ [SerpAPI] Search Error:', error);
    if (error instanceof Error) {
      console.error('❌ [SerpAPI] Error Message:', error.message);
      console.error('❌ [SerpAPI] Error Stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Search for nearby events using Google Search
 */
export async function searchNearbyEvents(
  venue: string,
  date: string,
  location?: string
): Promise<SerpApiSearchResponse> {
  console.log('🎯 [SerpAPI] searchNearbyEvents called with:', {
    venue,
    date,
    location,
  });

  // Format the date for better search results
  const eventDate = new Date(date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  console.log('📅 [SerpAPI] Formatted date:', formattedDate);

  // Construct a natural language query that includes location context
  const query = `events near "${venue}" on ${formattedDate}`;

  console.log('🔍 [SerpAPI] Constructed query:', query);

  // Use a generic location that SerpAPI supports
  // "Kuala Lumpur, Malaysia" is more likely to be recognized than specific venue names
  const supportedLocation = 'Kuala Lumpur, Malaysia';

  const searchParams = {
    q: query,
    location: supportedLocation,
    gl: 'my', // Malaysia country code
    hl: 'en', // English language
    num: 10, // Get top 10 results
  };

  console.log('⚙️ [SerpAPI] Search parameters:', searchParams);

  return searchGoogle(searchParams);
}

export default {
  searchGoogle,
  searchNearbyEvents,
};

