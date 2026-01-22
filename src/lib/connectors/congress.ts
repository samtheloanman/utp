import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CongressBill {
    bill_id: string;
    number: string;
    title: string;
    status: string;
    introduced_date: string;
    last_action_date: string;
    source_url: string;
    // ... other fields
}

export class CongressGovConnector {
    private apiBaseUrl = 'https://api.congress.gov/v3';
    private apiKey: string;
    private supabase: SupabaseClient;

    constructor(apiKey: string, supabaseUrl: string, supabaseKey: string) {
        this.apiKey = apiKey;
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Fetches recent bills from Congress.gov
     */
    async fetchRecentBills(limit: number = 20): Promise<any[]> {
        const url = `${this.apiBaseUrl}/bill?api_key=${this.apiKey}&limit=${limit}&format=json`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Congress.gov API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.bills || [];
    }

    /**
     * Normalizes and stores bills in Supabase
     */
    async ingestBills(bills: any[]): Promise<{ count: number; errors: any[] }> {
        let count = 0;
        const errors: any[] = [];

        // First, get the 'us-federal' jurisdiction ID
        const { data: jurisdiction, error: jError } = await this.supabase
            .from('jurisdictions')
            .select('id')
            .eq('code', 'us-federal')
            .single();

        if (jError || !jurisdiction) {
            throw new Error('Could not find us-federal jurisdiction in database');
        }

        // Get the Congress.gov source ID
        const { data: source, error: sError } = await this.supabase
            .from('data_sources')
            .select('id')
            .eq('name', 'Congress.gov')
            .single();

        if (sError || !source) {
            throw new Error('Could not find Congress.gov data source in database');
        }

        for (const bill of bills) {
            const externalId = `${bill.type.toLowerCase()}-${bill.number}-${bill.congress}`;

            const { error } = await this.supabase
                .from('bills')
                .upsert({
                    jurisdiction_id: jurisdiction.id,
                    source_id: source.id,
                    external_id: externalId,
                    bill_number: `${bill.type.toUpperCase()} ${bill.number}`,
                    title: bill.title,
                    status: bill.latestAction?.text || 'Introduced',
                    introduced_date: bill.introducedDate,
                    last_action_date: bill.latestAction?.actionDate,
                    source_url: bill.url,
                }, { onConflict: 'source_id, external_id' });

            if (error) {
                errors.push({ externalId, error });
            } else {
                count++;
            }
        }

        return { count, errors };
    }
}
