export default function DebugPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "(missing)";
  return (
    <pre style={{ padding: 16 }}>
      URL: {url}
      {"\n"}
      ANON starts with: {anon.slice(0, 8)}
      {"\n"}
      ANON length: {anon.length}
    </pre>
  );
}
