// Discovery now lives in the main Orbit shell.
export default function Discover() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: "/", permanent: false } };
}
