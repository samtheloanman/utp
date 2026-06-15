export default function LegislaturePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Legislature
      </h1>
      <p>
        This page will display tracked legislation from various countries.
        The UI will allow users to view details, see AI-generated debates (pros/cons),
        and participate in shadow voting.
      </p>
      {/* Placeholder for future components */}
      <div style={{ marginTop: '2rem', border: '1px dashed #ccc', padding: '2rem', borderRadius: '8px' }}>
        <p style={{ textAlign: 'center', color: '#888' }}>
          Legislation content will be displayed here.
        </p>
      </div>
    </div>
  );
}