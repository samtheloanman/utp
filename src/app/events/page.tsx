export default function EventsPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Event Voting
      </h1>
      <p>
        This page will feature Polymarket-style prediction markets on world events.
        Users can stake tokens on the outcomes of various events.
      </p>
      {/* Placeholder for future components */}
      <div style={{ marginTop: '2rem', border: '1px dashed #ccc', padding: '2rem', borderRadius: '8px' }}>
        <p style={{ textAlign: 'center', color: '#888' }}>
          Active and past events for voting will be displayed here.
        </p>
      </div>
    </div>
  );
}