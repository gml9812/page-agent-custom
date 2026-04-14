import type { LLMConfig } from '@page-agent/llms'

export const CHAT_DEFAULT_MODEL = 'gemini-3-flash-preview'
export const CHAT_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'

export const CHAT_DEFAULT_CONFIG: LLMConfig = {
	baseURL: CHAT_DEFAULT_BASE_URL,
	model: CHAT_DEFAULT_MODEL,
}

export const DEMO_MODEL = 'qwen3.5-plus'
export const DEMO_BASE_URL = 'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run'
export const DEMO_API_KEY = 'NA'

export const DEMO_CONFIG: LLMConfig = {
	baseURL: DEMO_BASE_URL,
	model: DEMO_MODEL,
	apiKey: DEMO_API_KEY,
}

/** Legacy testing endpoints that should be auto-migrated to CHAT_DEFAULT_BASE_URL */
export const LEGACY_TESTING_ENDPOINTS = [
	'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy',
	'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run',
]

export function isTestingEndpoint(url: string): boolean {
	const normalized = url.replace(/\/+$/, '')
	return LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep)
}

export function migrateLegacyEndpoint(config: LLMConfig): LLMConfig {
	const normalized = config.baseURL.replace(/\/+$/, '')
	if (LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep)) {
		return { ...CHAT_DEFAULT_CONFIG }
	}
	return config
}
