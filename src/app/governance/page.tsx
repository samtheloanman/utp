export default function GovernancePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        DAO Governance
      </h1>
      <p>
        This page will host the DAO governance portal. Users will be able to
        create proposals, view active and past proposals, and vote using their
        UTP token voting power.
      </p>
      {/* Placeholder for future components */}
      <div style={{ marginTop: '2rem', border: '1px dashed #ccc', padding: '2rem', borderRadius: '8px' }}>
        <p style={{ textAlign: 'center', color: '#888' }}>
          Governance proposals and voting interface will be displayed here.
        </p>
      </div>
    </div>
  );
}