// PARTIAL DIFF — only the changed parts of app/partner/signup/page.tsx
// Everything else in the file stays exactly as-is.

// 1. Add this import at the top of the file with the other imports:
import HCaptcha from "@/app/components/HCaptcha";

// 2. Replace the Step5 function signature and its internals with this:
function Step5({ data, onChange, onBack, onSubmit, submitting, error, onCaptchaVerify }: {
  data: FormData;
  onChange: (k: keyof FormData, v: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
  onCaptchaVerify: (token: string) => void;
}) {
  const bizAddress   = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");
  const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Company",          data.companyName],
    ["Contact",          data.contactName],
    ["Email",            data.email],
    ["Phone",            data.phone],
    ["Website",          data.website || "—"],
    ["Business Address", bizAddress],
    ["Fleet Address",    fleetAddress],
  ];
  return (
    <div className="space-y-5">
      <div><h2 className="text-2xl font-bold text-[#003768]">Review Your Details</h2><p className="mt-1 text-slate-500">Check everything looks correct before submitting.</p></div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-2xl border border-black/5 bg-slate-50 p-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="w-32 shrink-0 font-semibold text-slate-500">{label}</span>
            <span className="text-slate-800">{value}</span>
          </div>
        ))}
      </div>
      <InfoBox>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={data.agreedToTerms} onChange={e => onChange("agreedToTerms", e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#ff7a00]" />
          <span className="text-sm text-slate-700">
            I agree to the{" "}
            <button type="button" onClick={downloadTermsPDF} className="font-semibold text-[#003768] underline hover:opacity-75">
              Camel Global Partner Terms & Conditions
            </button>
            {" "}and confirm all information is accurate.
          </span>
        </label>
      </InfoBox>
      <HCaptcha onVerify={onCaptchaVerify} onExpire={() => onCaptchaVerify("")} />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">What happens next?</p>
        <p className="mt-1">Your application will be reviewed by our team. You will receive an email confirmation shortly, and we will be in touch once your account has been approved.</p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={onSubmit} disabled={!data.agreedToTerms || submitting}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-50">
          {submitting ? "Submitting..." : "Create my account"}
        </button>
      </div>
    </div>
  );
}

// 3. In PartnerSignupPage, add captcha token state:
//    const [captchaToken, setCaptchaToken] = useState("");

// 4. Update the submit() function — add captcha check at the top:
//    async function submit() {
//      if (!captchaToken) { setError("Please complete the CAPTCHA."); return; }
//      const captchaRes = await fetch("/api/auth/verify-captcha", {
//        method: "POST", headers: { "Content-Type": "application/json" },
//        body: JSON.stringify({ token: captchaToken }),
//      });
//      if (!captchaRes.ok) { setError("CAPTCHA verification failed. Please try again."); return; }
//      setSubmitting(true); setError("");
//      ... rest of submit unchanged ...

// 5. Update the Step5 render call to pass onCaptchaVerify:
//    {step === 5 && <Step5 ... onCaptchaVerify={setCaptchaToken} />}