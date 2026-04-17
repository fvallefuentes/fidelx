"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getTemplate } from "@/lib/wallet/templates";

export interface CardPreviewProps {
  templateId: string;
  logoUrl?: string | null;
  stripUrl?: string | null;
  programName: string;
  merchantName: string;
  backFields?: Array<{ label: string; value: string }>;
  currentStamps?: number;
  maxStamps?: number;
}

type Platform = "ios" | "android";

export function CardPreview(props: CardPreviewProps) {
  const [platform, setPlatform] = useState<Platform>("ios");
  const template = getTemplate(props.templateId);
  const stamps = props.currentStamps ?? 0;
  const max = props.maxStamps ?? 10;
  const backFields = props.backFields ?? [];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="inline-flex rounded-md border border-gray-200 bg-white p-1">
        <Button
          type="button"
          size="sm"
          variant={platform === "ios" ? "default" : "ghost"}
          onClick={() => setPlatform("ios")}
        >
          iOS
        </Button>
        <Button
          type="button"
          size="sm"
          variant={platform === "android" ? "default" : "ghost"}
          onClick={() => setPlatform("android")}
        >
          Android
        </Button>
      </div>

      {platform === "ios" ? (
        <IOSMockup
          template={template}
          logoUrl={props.logoUrl}
          stripUrl={props.stripUrl}
          programName={props.programName}
          merchantName={props.merchantName}
          backFields={backFields}
          stamps={stamps}
          max={max}
        />
      ) : (
        <AndroidMockup
          template={template}
          logoUrl={props.logoUrl}
          stripUrl={props.stripUrl}
          programName={props.programName}
          merchantName={props.merchantName}
          backFields={backFields}
          stamps={stamps}
          max={max}
        />
      )}
    </div>
  );
}

type MockupProps = {
  template: ReturnType<typeof getTemplate>;
  logoUrl?: string | null;
  stripUrl?: string | null;
  programName: string;
  merchantName: string;
  backFields: Array<{ label: string; value: string }>;
  stamps: number;
  max: number;
};

function IOSMockup({
  template,
  logoUrl,
  stripUrl,
  programName,
  merchantName,
  backFields,
  stamps,
  max,
}: MockupProps) {
  return (
    <div
      className="w-[320px] rounded-[44px] border-[10px] border-gray-900 bg-gray-900 shadow-xl"
      style={{ padding: "10px" }}
    >
      <div className="relative flex h-5 items-center justify-center rounded-t-[32px] bg-gray-900 text-[10px] text-white">
        <span className="absolute left-4">9:41</span>
        <div className="h-4 w-20 rounded-full bg-black" />
      </div>
      <div className="rounded-b-[32px] bg-gray-100 p-3">
        <div
          className="overflow-hidden rounded-2xl shadow-md"
          style={{ backgroundColor: template.bgColor, color: template.textColor }}
        >
          <div className="flex items-start justify-between gap-2 p-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                className="max-h-10 w-auto object-contain"
              />
            ) : (
              <div />
            )}
            <span
              className="text-xs font-medium"
              style={{ color: template.labelColor }}
            >
              {merchantName}
            </span>
          </div>
          <div className="px-3 pb-2">
            <p
              className="text-lg font-semibold leading-tight"
              style={{ color: template.textColor }}
            >
              {programName}
            </p>
          </div>
          {stripUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stripUrl}
              alt="strip"
              className="h-[98px] w-full object-cover"
            />
          )}
          <div className="flex items-end justify-between p-3">
            <div>
              <p
                className="text-[10px] uppercase tracking-wide"
                style={{ color: template.labelColor }}
              >
                Tampons
              </p>
              <p
                className="text-base font-semibold"
                style={{ color: template.textColor }}
              >
                {stamps} / {max}
              </p>
            </div>
          </div>
        </div>

        {backFields.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl bg-white p-3 text-xs">
            {backFields.map((f, i) => (
              <div key={i}>
                <p
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: template.labelColor }}
                >
                  {f.label}
                </p>
                <p style={{ color: template.textColor }}>{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AndroidMockup({
  template,
  logoUrl,
  stripUrl,
  programName,
  merchantName,
  backFields,
  stamps,
  max,
}: MockupProps) {
  return (
    <div className="w-[320px] rounded-[28px] border-[4px] border-gray-800 bg-white shadow-xl">
      <div className="flex h-5 items-center justify-between rounded-t-[24px] bg-white px-4 text-[10px] text-gray-700">
        <span>9:41</span>
        <span>G Wallet</span>
      </div>
      <div className="rounded-b-[24px] bg-gray-50 p-3">
        <div
          className="overflow-hidden rounded-xl shadow-sm"
          style={{ backgroundColor: template.bgColor, color: template.textColor }}
        >
          <div className="flex items-center gap-2 p-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                className="h-8 w-8 rounded-full object-contain bg-white/20 p-1"
              />
            )}
            <span
              className="text-sm font-medium"
              style={{ color: template.labelColor }}
            >
              {merchantName}
            </span>
          </div>
          <div className="px-3 pb-2">
            <p
              className="text-base font-semibold"
              style={{ color: template.textColor }}
            >
              {programName}
            </p>
          </div>
          {stripUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stripUrl}
              alt="hero"
              className="h-[98px] w-full object-cover"
            />
          )}
          <div className="p-3">
            <p
              className="text-[10px] uppercase tracking-wide"
              style={{ color: template.labelColor }}
            >
              Tampons
            </p>
            <p
              className="text-lg font-semibold"
              style={{ color: template.textColor }}
            >
              {stamps} / {max}
            </p>
          </div>
        </div>

        {backFields.length > 0 && (
          <div className="mt-3 divide-y divide-gray-200 rounded-xl bg-white">
            {backFields.map((f, i) => (
              <div key={i} className="p-3">
                <p
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: template.labelColor }}
                >
                  {f.label}
                </p>
                <p
                  className="text-sm"
                  style={{ color: template.textColor }}
                >
                  {f.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CardPreview;
