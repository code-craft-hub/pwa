"use client";

interface Job {
  id: string;
  title: string | null;
  companyName: string | null;
  companyLogo: string | null;
  emailApply: string | null;
  location: string | null;
  employmentType: string | null;
  postedAt: string | null;
  classification: string | null;
  applyUrl: string | null;
  link: string | null;
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return null;
  }
}

interface Props {
  job: Job;
  onApply: (job: Job) => void;
  applying?: boolean;
}

const capitalize = (str: string | null) => {
  if (!str) return "";
  return str
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function JobCard({ job, onApply, applying }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {job.companyLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={job.companyLogo}
            alt={job.companyName ?? ""}
            className="w-11 h-11 rounded-xl object-contain border border-gray-100 flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-400 flex-shrink-0">
            {(job.companyName ?? "?")[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {capitalize(job.title) ?? "Untitled Role"}
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">{job.companyName}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {extractDomain(job.applyUrl ?? job.link) && (
          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            {extractDomain(job.applyUrl ?? job.link)}
          </span>
        )}
        {job.location && (
          <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
            {job.location}
          </span>
        )}
        {job.emailApply && (
          <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
            {job.emailApply}
          </span>
        )}
        {job.employmentType && (
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">
            {job.employmentType.replace("_", " ")}
          </span>
        )}
        {job.classification && (
          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full capitalize">
            {job.classification}
          </span>
        )}
      </div>

      <button
        onClick={() => onApply(job)}
        disabled={applying}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all
          bg-indigo-600 text-white active:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {applying ? "Starting bot…" : "Auto Apply"}
      </button>
    </div>
  );
}
