/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {GoogleGenAI, Type} from '@google/genai';

// This check is for development-time feedback.
if (!process.env.API_KEY) {
  console.error(
    'API_KEY environment variable is not set. The application will not be able to connect to the Gemini API.',
  );
}

// The "!" asserts API_KEY is non-null after the check.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});
const artModelName = 'gemini-2.5-flash';
const textModelName = 'gemini-2.5-flash-lite';
/**
 * Art-direction toggle for ASCII art generation.
 * `true`: Slower, higher-quality results (allows the model to "think").
 * `false`: Faster, potentially lower-quality results (skips thinking).
 */
const ENABLE_THINKING_FOR_ASCII_ART = false;

/**
 * Art-direction toggle for blocky ASCII text generation.
 * `true`: Generates both creative art and blocky text for the topic name.
 * `false`: Generates only the creative ASCII art.
 */
const ENABLE_ASCII_TEXT_GENERATION = false;

export interface AsciiArtData {
  art: string;
  text?: string; // Text is now optional
}

export interface CulturalConcept {
  term: string;
  culture: string;
}

export interface PhonosemanticResult {
  language: string;
  script: string;
  lemma: string;
  romanization: string;
  IPA: string;
  gloss: string;
  etymology: string;
  source_url: string;
  cultural_tags: string[];
  semantic_cluster: string;
}

export interface ScriptResult {
  language: string;
  word: string;
  script: string;
  romanization: string;
  ipa: string;
  note: string;
}


/**
 * Streams a definition for a given topic from the Gemini API.
 * @param topic The word or term to define.
 * @returns An async generator that yields text chunks of the definition.
 */
export async function* streamDefinition(
  topic: string,
): AsyncGenerator<string, void, undefined> {
  if (!process.env.API_KEY) {
    yield 'Error: API_KEY is not configured. Please check your environment variables to continue.';
    return;
  }

  const prompt = `Provide a concise, single-paragraph encyclopedia-style definition for the term: "${topic}". Be informative and neutral. Do not use markdown, titles, or any special formatting. Respond with only the text of the definition itself.`;

  try {
    const response = await ai.models.generateContentStream({
      model: textModelName,
      contents: prompt,
      config: {
        // Disable thinking for the lowest possible latency, as requested.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error('Error streaming from Gemini:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    yield `Error: Could not generate content for "${topic}". ${errorMessage}`;
    // Re-throwing allows the caller to handle the error state definitively.
    throw new Error(errorMessage);
  }
}

/**
 * Generates a single random word or concept using the Gemini API.
 * @returns A promise that resolves to a single random word.
 */
export async function getRandomWord(): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured.');
  }

  const prompt = `Generate a single, random, interesting English word or a two-word concept. It can be a noun, verb, adjective, or a proper noun. Respond with only the word or concept itself, with no extra text, punctuation, or formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: prompt,
      config: {
        // Disable thinking for low latency.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return response.text.trim();
  } catch (error) {
    console.error('Error getting random word from Gemini:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Could not get random word: ${errorMessage}`);
  }
}

/**
 * Generates ASCII art and optionally text for a given topic.
 * @param topic The topic to generate art for.
 * @returns A promise that resolves to an object with art and optional text.
 */
export async function generateAsciiArt(topic: string): Promise<AsciiArtData> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured.');
  }
  
  const artPromptPart = `1. "art": meta ASCII visualization of the word "${topic}":
  - Palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|
  - Shape mirrors concept - make the visual form embody the word's essence
  - Examples: 
    * "explosion" → radiating lines from center
    * "hierarchy" → pyramid structure
    * "flow" → curved directional lines
  - Return as single string with \n for line breaks`;


  const keysDescription = `one key: "art"`;
  const promptBody = artPromptPart;

  const prompt = `For "${topic}", create a JSON object with ${keysDescription}.
${promptBody}

Return ONLY the raw JSON object, no additional text. The response must start with "{" and end with "}" and contain only the art property.`;

  const maxRetries = 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // FIX: Construct config object conditionally to avoid spreading a boolean
      const config: any = {
        responseMimeType: 'application/json',
      };
      if (!ENABLE_THINKING_FOR_ASCII_ART) {
        config.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await ai.models.generateContent({
        model: artModelName,
        contents: prompt,
        config: config,
      });

      let jsonStr = response.text.trim();
      
      // Debug logging
      console.log(`Attempt ${attempt}/${maxRetries} - Raw API response:`, jsonStr);
      
      // Remove any markdown code fences if present
      const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }

      // Ensure the string starts with { and ends with }
      if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
        throw new Error('Response is not a valid JSON object');
      }

      const parsedData = JSON.parse(jsonStr) as AsciiArtData;
      
      // Validate the response structure
      if (typeof parsedData.art !== 'string' || parsedData.art.trim().length === 0) {
        throw new Error('Invalid or empty ASCII art in response');
      }
      
      // If we get here, the validation passed
      const result: AsciiArtData = {
        art: parsedData.art,
      };

      if (ENABLE_ASCII_TEXT_GENERATION && parsedData.text) {
        result.text = parsedData.text;
      }
      
      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        console.error('All retry attempts failed for ASCII art generation');
        throw new Error(`Could not generate ASCII art after ${maxRetries} attempts: ${lastError.message}`);
      }
      // Continue to next attempt
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Fetches cross-cultural concepts related to a given topic.
 * @param topic The topic to find related concepts for.
 * @returns A promise that resolves to an array of cultural concepts.
 */
export async function getCrossCulturalConcepts(topic: string): Promise<CulturalConcept[]> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured.');
  }

  const prompt = `For the term "${topic}", find 3 to 5 related or analogous concepts from distinct world cultures. Avoid simple translations. Focus on concepts that share a similar philosophical, aesthetic, or functional essence.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: {
                type: Type.STRING,
                description: 'The name of the cultural concept.',
              },
              culture: {
                type: Type.STRING,
                description: 'The culture of origin for the concept (e.g., Japanese, Greek).',
              },
            },
            required: ['term', 'culture'],
          },
        },
      },
    });
    
    let jsonStr = response.text.trim();
    // In case the model still wraps it in markdown
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    const concepts = JSON.parse(jsonStr) as CulturalConcept[];
    // Basic validation
    if (!Array.isArray(concepts)) {
      throw new Error('Response is not a valid array of concepts.');
    }
    return concepts;
  } catch (error) {
    console.error('Error fetching cross-cultural concepts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Could not fetch cultural concepts: ${errorMessage}`);
  }
}

/**
 * Performs a phonosemantic search for words containing HA/AH motifs.
 * @param filters Search parameters including position, languages, and fuzzy matching.
 * @returns A promise that resolves to an array of structured phonosemantic results.
 */
export async function performPhonosemanticSearch(filters: {
  position: 'initial' | 'medial' | 'final' | 'any';
  languages: string;
  fuzzy: boolean;
}): Promise<PhonosemanticResult[]> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured.');
  }

  const prompt = `
  You are an expert computational linguist and etymologist with access to a vast cross-linguistic lexical database.
  
  Your task is to perform a phonosemantic search for words containing the sound motif 'HA' or 'AH'.

  Search Rules:
  1.  **Core Motif**: Search for 'ha' and 'ah' sounds. Include variants with diacritics (e.g., ḥa, hā, aḥ).
  2.  **H-Class Equivalency**: Treat the sounds represented by 'ḥ' (pharyngeal), 'kh' (voiceless velar fricative /x/), and 'x' as equivalent to 'h' for this search.
  3.  **Position**: The motif must appear in the **${filters.position}** position of the word.
  4.  **Languages**: Limit the search to the following languages: **${filters.languages}**.
  5.  **Fuzzy Matching**: ${filters.fuzzy ? "ENABLED: Also include close phonetic matches with a Levenshtein distance of 1 (e.g., 'ho', 'ax', 'cha')." : "DISABLED: Match the motif strictly."}
  6.  **Data Quality**: Provide accurate data. For etymology, be concise. For 'source_url', link to a reputable source like Wiktionary if possible.

  Output requirements:
  - The output must be a single JSON object with one key, "results", containing an array of word objects.
  - Each object in the array must conform to the specified schema.
  - **Semantic Clustering**: For each result, assign it to a semantic cluster based on its gloss. Pre-defined clusters are "breath/voice", "divinity/light", "laughter/joy". If a word fits one of these, use that name. If it fits another semantic group, create a new, appropriate cluster name (e.g., "negation/question", "place/location"). This must be in the 'semantic_cluster' field.
  - Handle Unicode and right-to-left scripts correctly.
  - If no results are found, return an empty "results" array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  language: { type: Type.STRING },
                  script: { type: Type.STRING },
                  lemma: { type: Type.STRING },
                  romanization: { type: Type.STRING },
                  IPA: { type: Type.STRING },
                  gloss: { type: Type.STRING },
                  etymology: { type: Type.STRING },
                  source_url: { type: Type.STRING },
                  cultural_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  semantic_cluster: { type: Type.STRING },
                },
                required: ['language', 'script', 'lemma', 'romanization', 'IPA', 'gloss', 'etymology', 'source_url', 'cultural_tags', 'semantic_cluster']
              }
            }
          }
        }
      }
    });

    let jsonStr = response.text.trim();
    // In case the model still wraps it in markdown
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    
    const data = JSON.parse(jsonStr) as { results: PhonosemanticResult[] };
    if (!data || !Array.isArray(data.results)) {
      throw new Error("Invalid response format from API.");
    }
    return data.results;

  } catch (error) {
    console.error('Error in phonosemantic search:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Could not perform phonosemantic search: ${errorMessage}`);
  }
}


/**
 * Gets the writing of a word in a specific language and script.
 * @param word The word or concept to write.
 * @param language The target language.
 * @returns A promise that resolves to the structured script result.
 */
export async function getScriptForWord(word: string, language: string): Promise<ScriptResult> {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not configured.');
  }

  const prompt = `
    You are an expert linguist and polyglot. Your task is to provide detailed information on how to write a specific word in a given language.

    Word/Concept: "${word}"
    Language: "${language}"

    Provide the following information in a JSON object:
    1.  **script**: The word written in the language's native script.
    2.  **romanization**: A standard academic romanization of the word.
    3.  **ipa**: The International Phonetic Alphabet (IPA) transcription.
    4.  **note**: A brief, one-sentence note about the word's usage, form, or context (e.g., "This is the formal term," or "An informal term of endearment.").

    If the word doesn't exist or is nonsensical in the target language, return null values for the fields.
    Return only the raw JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            romanization: { type: Type.STRING },
            ipa: { type: Type.STRING },
            note: { type: Type.STRING },
          },
          required: ['script', 'romanization', 'ipa', 'note']
        }
      }
    });

    let jsonStr = response.text.trim();
    const parsed = JSON.parse(jsonStr) as Omit<ScriptResult, 'language' | 'word'>;

    if (!parsed.script) {
        throw new Error(`Could not find a representation for "${word}" in ${language}.`);
    }

    return {
      ...parsed,
      language: language,
      word: word,
    };

  } catch (error) {
    console.error('Error in getScriptForWord:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Could not get script for "${word}" in ${language}: ${errorMessage}`);
  }
}
