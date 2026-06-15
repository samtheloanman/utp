export default function StablecoinPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        UBTC Stablecoin
      </h1>
      <p>
        This page will provide tools for managing the UBTC Stablecoin. Users can
        mint new UBTC by depositing BTC collateral, as well as burn UBTC to
        redeem their collateral.
      </p>
      {/* Placeholder for future components */}
      <div style={{ marginTop: '2rem', border: '1px dashed #ccc', padding: '2rem', borderRadius: '8px' }}>
        <p style={{ textAlign: 'center', color: '#888' }}>
          Mint, redeem, and collateral management interface will be displayed here.
        </p>
      </div>
    </div>
  );
}