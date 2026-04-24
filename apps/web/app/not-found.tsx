// Root not-found — redirects to default locale's not-found
import { redirect } from 'next/navigation';

export default function RootNotFound() {
  redirect('/en');
}
