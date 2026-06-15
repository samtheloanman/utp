export default function NewsPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        News Hub
      </h1>
      <p>
        This page will display aggregated world news from sources like GDELT,
        complete with AI-powered fact-checking and bias scoring.
      </p>
      {/* Placeholder for future components */}
      <div style={{ marginTop: '2rem', border: '1px dashed #ccc', padding: '2rem', borderRadius: '8px' }}>
        <p style={{ textAlign: 'center', color: '#888' }}>
          News feed and analysis will be displayed here.
        </p>
      </div>
    </div>
  );
}