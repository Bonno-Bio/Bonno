"use client";
import { useEffect } from "react";
import { captureException } from "@/lib/monitoring";
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { captureException(error, { digest: error.digest, surface: "global_error_boundary" }); }, [error]); return <html><body><main style={{ fontFamily: "system-ui", padding: 40 }}><h1>KgweboOS needs to reload</h1><p>We recorded the error. Please try again.</p><button onClick={() => reset()}>Reload</button></main></body></html>; }
