import { useState, useEffect, useRef } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { compressImageFile } from "@/lib/imageCompression";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
      onBeforeFileAdded: (currentFile) => {
        if ((currentFile as any).meta?._compressed) {
          return true;
        }
        if (currentFile.data instanceof File && currentFile.data.type.startsWith("image/")) {
          compressImageFile(currentFile.data)
            .then((compressed) => {
              uppy.addFile({
                name: compressed.name,
                type: compressed.type,
                data: compressed,
                source: "Local",
                isRemote: false,
                meta: { _compressed: true },
              });
            })
            .catch((err) => {
              console.warn("Image compression failed, using original file:", err);
              uppy.addFile({
                name: currentFile.name,
                type: currentFile.type,
                data: currentFile.data,
                source: "Local",
                isRemote: false,
                meta: { _compressed: true },
              });
            });
          return false;
        }
        return true;
      },
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onCompleteRef.current?.(result);
        setShowModal(false);
      })
  );

  useEffect(() => {
    return () => {
      uppy.cancelAll();
      uppy.getFiles().forEach(file => uppy.removeFile(file.id));
      (uppy as any).close?.();
    };
  }, [uppy]);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowModal(true)}
        data-testid="button-upload-image"
      >
        Add photo from gallery
      </Button>

      {showModal && (
        <DashboardModal
          uppy={uppy}
          open={showModal}
          onRequestClose={() => setShowModal(false)}
          proudlyDisplayPoweredByUppy={false}
        />
      )}
    </div>
  );
}
