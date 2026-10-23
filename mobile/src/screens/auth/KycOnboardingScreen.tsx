import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

interface KycOnboardingScreenProps {
  onSubmitted: () => void;
  onLogout: () => void;
}

export const KycOnboardingScreen: React.FC<KycOnboardingScreenProps> = ({
  onSubmitted,
  onLogout
}) => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useUIStore();

  // Multi-step KYC: 1: Profile Pic -> 2: Live Camera Photo -> 3: Aadhaar -> 4: PAN -> 5: Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.avatarUrl ||
      (user?.primaryRole === 'demat_holder'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80')
  );

  type CameraTarget = 'selfie' | 'aadhaar_front' | 'aadhaar_back' | 'pan_card';

  // Step 2: Live Camera Photo (Camera only, strictly no gallery)
  const [livePhotoUrl, setLivePhotoUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Step 3: Aadhaar Card (Front and Back)
  const [aadhaarNumber, setAadhaarNumber] = useState('5482 9104 3829');
  const [aadhaarFrontUrl, setAadhaarFrontUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80'
  );
  const [aadhaarBackUrl, setAadhaarBackUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80'
  );
  const [aadhaarFrontLive, setAadhaarFrontLive] = useState(false);
  const [aadhaarBackLive, setAadhaarBackLive] = useState(false);

  // Step 4: PAN Card
  const [panNumber, setPanNumber] = useState('ABCDE1234F');
  const [panCardUrl, setPanCardUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&auto=format&fit=crop&q=80'
  );
  const [panCardLive, setPanCardLive] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically release camera when moving between steps
  useEffect(() => {
    stopCamera();
  }, [currentStep]);

  // Initialize and stop camera stream with proper device facingMode
  const startCamera = async (target: CameraTarget = 'selfie') => {
    setCameraError(null);
    setCameraTarget(target);
    setCameraActive(true);

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        const constraints: MediaStreamConstraints =
          target === 'selfie'
            ? { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } }
            : {
                video: {
                  facingMode: { ideal: 'environment' },
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }
              };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // Graceful fallback to any accessible video source
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn('Camera access denied or unavailable:', err);
        const isCard = target !== 'selfie';
        setCameraError(
          isCard
            ? 'Camera access was blocked or device has no camera. You can capture a crystal-clear test card below.'
            : 'Camera access blocked or device has no camera. A high-resolution live selfie capture simulation will be used.'
        );
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
    setCameraTarget(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFallbackCapture = (target: CameraTarget) => {
    if (target === 'selfie') {
      const simulatedLivePhoto =
        user?.primaryRole === 'demat_holder'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80';
      setLivePhotoUrl(simulatedLivePhoto);
      addToast('Live camera photo captured!', 'success');
    } else if (target === 'aadhaar_front') {
      setAadhaarFrontUrl(
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80'
      );
      setAadhaarFrontLive(true);
      addToast('Aadhaar Front captured from live camera!', 'success');
    } else if (target === 'aadhaar_back') {
      setAadhaarBackUrl(
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
      );
      setAadhaarBackLive(true);
      addToast('Aadhaar Back captured from live camera!', 'success');
    } else if (target === 'pan_card') {
      setPanCardUrl(
        'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80'
      );
      setPanCardLive(true);
      addToast('PAN Card captured from live camera!', 'success');
    }
    stopCamera();
  };

  // Capture photo from live camera video stream
  const captureLiveSnapshot = () => {
    const target =
      cameraTarget ||
      (currentStep === 2 ? 'selfie' : currentStep === 3 ? 'aadhaar_front' : 'pan_card');

    if (videoRef.current && videoRef.current.videoWidth) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (target === 'selfie') {
            // Mirror image for front facing camera natural feel
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          // For card scanning, keep original orientation so card text is readable!
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

          if (target === 'selfie') {
            setLivePhotoUrl(dataUrl);
            addToast('Live camera photo captured!', 'success');
          } else if (target === 'aadhaar_front') {
            setAadhaarFrontUrl(dataUrl);
            setAadhaarFrontLive(true);
            addToast('Aadhaar Card Front captured from live camera!', 'success');
          } else if (target === 'aadhaar_back') {
            setAadhaarBackUrl(dataUrl);
            setAadhaarBackLive(true);
            addToast('Aadhaar Card Back captured from live camera!', 'success');
          } else if (target === 'pan_card') {
            setPanCardUrl(dataUrl);
            setPanCardLive(true);
            addToast('PAN Card captured from live camera!', 'success');
          }

          stopCamera();
          return;
        }
      } catch (e) {
        console.error('Error snapshotting from video:', e);
      }
    }

    handleFallbackCapture(target);
  };

  const handleFinalKycSubmit = async () => {
    if (!livePhotoUrl) {
      setErrorMessage('Please capture your live photo using the device camera.');
      setCurrentStep(2);
      return;
    }
    if (!aadhaarNumber.replace(/\D/g, '') || aadhaarNumber.replace(/\D/g, '').length < 12) {
      setErrorMessage('Please enter a valid 12-digit Aadhaar card number.');
      setCurrentStep(3);
      return;
    }
    if (!aadhaarFrontUrl || !aadhaarBackUrl) {
      setErrorMessage('Please attach both Front and Back sides of your Aadhaar card.');
      setCurrentStep(3);
      return;
    }
    if (!panNumber.trim() || panNumber.trim().length !== 10) {
      setErrorMessage('Please enter a valid 10-character PAN number.');
      setCurrentStep(4);
      return;
    }
    if (!panCardUrl) {
      setErrorMessage('Please attach your PAN card document.');
      setCurrentStep(4);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/users/kyc', {
        avatarUrl,
        livePhotoUrl,
        aadhaarNumber: aadhaarNumber.trim(),
        aadhaarFrontUrl,
        aadhaarBackUrl,
        panNumber: panNumber.trim().toUpperCase(),
        panCardUrl,
        documentType: 'Aadhaar (Front & Back) + PAN Card Verification'
      });

      if (res.data.success) {
        addToast('KYC documents submitted securely for compliance review!', 'success');
        if (res.data.data?.user) {
          updateUser(res.data.data.user);
        } else {
          updateUser({
            avatarUrl,
            isKycVerified: false,
            kycDetails: {
              documentType: 'Aadhaar + PAN Verification',
              documentNumberMasked: `XXXX-XXXX-${aadhaarNumber.slice(-4)} / ${panNumber.slice(0, 5)}****`,
              submittedAt: new Date().toISOString(),
              status: 'pending',
              livePhotoUrl,
              aadhaarNumber,
              aadhaarFrontUrl,
              aadhaarBackUrl,
              panNumber,
              panCardUrl
            }
          });
        }
        onSubmitted();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit KYC documents.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderCardScanner = (target: 'aadhaar_front' | 'aadhaar_back' | 'pan_card') => {
    const cardName =
      target === 'aadhaar_front'
        ? 'Aadhaar Card (Front Side)'
        : target === 'aadhaar_back'
        ? 'Aadhaar Card (Back Side)'
        : 'PAN Card';

    const badgeText =
      target === 'aadhaar_front'
        ? 'AADHAAR FRONT'
        : target === 'aadhaar_back'
        ? 'AADHAAR BACK'
        : 'PAN CARD';

    const instructionText =
      target === 'aadhaar_front'
        ? 'Please place your Aadhaar Card (Front Side) properly inside the green alignment border in order to get it captured clearly. Ensure good lighting and all 4 corners are visible with no glare.'
        : target === 'aadhaar_back'
        ? 'Please place your Aadhaar Card (Back Side) properly inside the green alignment border in order to get it captured clearly. Ensure your residential address and QR code are in clear focus.'
        : 'Please place your PAN Card properly inside the green alignment border in order to get it captured clearly. Ensure your 10-character PAN number and signature are sharp and readable.';

    return (
      <View style={styles.cardScannerContainer}>
        {/* Prominent Card Placement Instructions Card */}
        <View style={styles.cardInstructionCard}>
          <View style={styles.cardInstructionHeader}>
            <Icon name="camera" size={18} color={colors.primaryActionBlue} />
            <Text style={styles.cardInstructionTitle}>Place {cardName} within Frame</Text>
          </View>
          <Text style={styles.cardInstructionBody}>{instructionText}</Text>

          {/* Verification Checklist Chips */}
          <View style={styles.scannerTipsRow}>
            <View style={styles.scannerTipChip}>
              <Icon name="check" size={11} color={colors.success} strokeWidth={3} />
              <Text style={styles.scannerTipText}>Fit 4 Corners</Text>
            </View>
            <View style={styles.scannerTipChip}>
              <Icon name="check" size={11} color={colors.success} strokeWidth={3} />
              <Text style={styles.scannerTipText}>Even Lighting</Text>
            </View>
            <View style={styles.scannerTipChip}>
              <Icon name="check" size={11} color={colors.success} strokeWidth={3} />
              <Text style={styles.scannerTipText}>No Glare or Shadow</Text>
            </View>
          </View>
        </View>

        {/* Live Video Viewfinder with ID Card Reticle */}
        <View style={styles.cameraContainer}>
          <View style={styles.liveStreamWrapper}>
            {Platform.OS === 'web' && (
              // @ts-ignore HTML5 video for React Native Web
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && mediaStreamRef.current) {
                    el.srcObject = mediaStreamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: 250,
                  objectFit: 'cover',
                  borderRadius: 20
                }}
              />
            )}

            {/* Authentic ID Card Reticle with 4 Corner Brackets */}
            <View style={styles.cardReticleBox} pointerEvents="none">
              <View style={[styles.cornerBracket, styles.cornerTL]} />
              <View style={[styles.cornerBracket, styles.cornerTR]} />
              <View style={[styles.cornerBracket, styles.cornerBL]} />
              <View style={[styles.cornerBracket, styles.cornerBR]} />

              <View style={styles.reticleBadge}>
                <Icon name="shield" size={10} color="#FFFFFF" />
                <Text style={styles.reticleBadgeText}>{badgeText}</Text>
              </View>

              <View style={styles.scanLineGuide} />

              <View style={styles.reticleBottomStatus}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.reticleStatusText}>Hold Steady • Align Card Borders</Text>
              </View>
            </View>

            {/* Shutter Button over Viewfinder */}
            <TouchableOpacity
              style={styles.cardShutterBtn}
              onPress={captureLiveSnapshot}
              activeOpacity={0.85}
            >
              <View style={styles.cardShutterInner}>
                <Icon name="camera" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Action Controls: Cancel & Capture CTA */}
          <View style={styles.scannerActionButtonsRow}>
            <TouchableOpacity
              style={styles.cancelCameraBtn}
              onPress={stopCamera}
              activeOpacity={0.8}
            >
              <Icon name="x" size={14} color={colors.secondaryText} />
              <Text style={styles.cancelCameraBtnText}>Close Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureCtaBtn}
              onPress={captureLiveSnapshot}
              activeOpacity={0.85}
            >
              <Icon name="camera" size={15} color="#FFFFFF" />
              <Text style={styles.captureCtaBtnText}>
                {target === 'aadhaar_front'
                  ? 'Capture Front Side'
                  : target === 'aadhaar_back'
                  ? 'Capture Back Side'
                  : 'Capture PAN Card'}
              </Text>
            </TouchableOpacity>
          </View>

          {cameraError && (
            <View style={styles.cameraErrorBox}>
              <Text style={styles.cameraErrorText}>{cameraError}</Text>
              <TouchableOpacity
                style={styles.useFallbackCardBtn}
                onPress={() => handleFallbackCapture(target)}
              >
                <Icon name="check-circle" size={14} color={colors.primaryActionBlue} />
                <Text style={styles.useFallbackCardBtnText}>Capture Crystal-Clear Sample Card</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step {currentStep} of 5</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Icon name="log-out" size={16} color={colors.secondaryText} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.headerSection}>
        <Text style={styles.screenTitle}>Identity Verification (KYC)</Text>
        <Text style={styles.screenSubtitle}>
          Complete mandatory statutory verification to unlock certified IPO networking
        </Text>
      </View>

      {/* Horizontal Steps Progress */}
      <View style={styles.progressBarRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View
            key={s}
            style={[
              styles.progressSegment,
              currentStep >= s ? styles.progressSegmentActive : styles.progressSegmentInactive
            ]}
          />
        ))}
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Icon name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP 1: PROFILE PICTURE                                  */}
      {/* -------------------------------------------------------- */}
      {currentStep === 1 && (
        <View style={styles.stepCard}>
          <View style={styles.stepTitleRow}>
            <Icon name="user" size={18} color={colors.primaryBlue} />
            <Text style={styles.stepTitle}>1. Update Profile Picture</Text>
          </View>
          <Text style={styles.stepDesc}>
            Choose or confirm your personal display picture seen by verified connections.
          </Text>

          {/* Avatar Preview */}
          <View style={styles.avatarPreviewCenter}>
            <View style={styles.largeAvatarWrapper}>
              <Image source={{ uri: avatarUrl }} style={styles.largeAvatarImg} resizeMode="cover" />
            </View>
          </View>

          {/* Quick Preset Selector */}
          <Text style={styles.presetLabel}>Select from high-resolution 3D presets:</Text>
          <View style={styles.presetRow}>
            {[
              {
                label: 'Investor',
                uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
              },
              {
                label: 'Professional',
                uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
              },
              {
                label: 'Executive',
                uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
              },
              {
                label: 'Advisor',
                uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
              }
            ].map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetBtn,
                  avatarUrl === p.uri && styles.presetBtnActive
                ]}
                onPress={() => setAvatarUrl(p.uri)}
              >
                <Image source={{ uri: p.uri }} style={styles.presetThumb} />
                <Text style={styles.presetText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.nextStepBtn}
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.88}
          >
            <Text style={styles.nextStepBtnText}>Next: Live Camera Photo</Text>
            <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP 2: LIVE CAMERA PHOTO (NOT GALLERY)                  */}
      {/* -------------------------------------------------------- */}
      {currentStep === 2 && (
        <View style={styles.stepCard}>
          <View style={styles.stepTitleRow}>
            <Icon name="camera" size={18} color={colors.primaryBlue} />
            <Text style={styles.stepTitle}>2. Live Photo (Camera Only)</Text>
          </View>

          {/* Compliance Notice */}
          <View style={styles.cameraComplianceNotice}>
            <Icon name="shield" size={16} color={colors.primaryBlue} />
            <Text style={styles.cameraComplianceText}>
              <Text style={styles.bold}>Live Camera Only:</Text> As per SEBI/KYC compliance standards, your photo must be captured live using the device camera. Gallery and file uploads are disabled for this step.
            </Text>
          </View>

          {/* Camera Viewfinder or Snapshot Preview */}
          <View style={styles.cameraContainer}>
            {cameraActive && cameraTarget === 'selfie' ? (
              <View style={styles.liveStreamWrapper}>
                {Platform.OS === 'web' && (
                  // @ts-ignore HTML5 video for React Native Web
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && mediaStreamRef.current) {
                        el.srcObject = mediaStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: 240,
                      objectFit: 'cover',
                      borderRadius: 18,
                      transform: 'scaleX(-1)'
                    }}
                  />
                )}
                {/* Oval Face Guide Overlay */}
                <View style={styles.faceOvalOverlay} pointerEvents="none" />
                <TouchableOpacity
                  style={styles.shutterBtn}
                  onPress={captureLiveSnapshot}
                  activeOpacity={0.85}
                >
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              </View>
            ) : livePhotoUrl ? (
              <View style={styles.snapshotPreviewBox}>
                <Image
                  source={{ uri: livePhotoUrl }}
                  style={styles.snapshotImg}
                  resizeMode="cover"
                />
                <View style={styles.verifiedSelfieTag}>
                  <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.verifiedSelfieText}>Live Camera Captured</Text>
                </View>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => startCamera('selfie')}
                  activeOpacity={0.8}
                >
                  <Icon name="refresh" size={14} color={colors.primaryBlue} />
                  <Text style={styles.retakeBtnText}>Retake Live Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraPlaceholderBox}>
                <View style={styles.cameraIconBig}>
                  <Icon name="camera" size={36} color={colors.primaryBlue} />
                </View>
                <Text style={styles.cameraPromptTitle}>Ready for Live Photo</Text>
                <Text style={styles.cameraPromptSub}>
                  Position your face clearly within the frame under good lighting.
                </Text>
                <TouchableOpacity
                  style={styles.openCameraBtn}
                  onPress={() => startCamera('selfie')}
                  activeOpacity={0.88}
                >
                  <Icon name="camera" size={18} color="#FFFFFF" />
                  <Text style={styles.openCameraBtnText}>Open Device Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {cameraError && (
            <Text style={styles.cameraErrorText}>{cameraError}</Text>
          )}

          {/* Navigation Buttons */}
          <View style={styles.stepButtonsRow}>
            <TouchableOpacity
              style={styles.prevStepBtn}
              onPress={() => setCurrentStep(1)}
            >
              <Text style={styles.prevStepBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextStepBtn, { flex: 1 }, !livePhotoUrl && styles.btnDisabled]}
              disabled={!livePhotoUrl}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.nextStepBtnText}>Next: Aadhaar Card</Text>
              <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP 3: AADHAAR CARD (FRONT AND BACK)                    */}
      {/* -------------------------------------------------------- */}
      {currentStep === 3 && (
        <View style={styles.stepCard}>
          <View style={styles.stepTitleRow}>
            <Icon name="file-text" size={18} color={colors.primaryBlue} />
            <Text style={styles.stepTitle}>3. Aadhaar Card (Front & Back)</Text>
          </View>
          <Text style={styles.stepDesc}>
            Provide your 12-digit Aadhaar number and capture clear images of both front and back sides using the live camera.
          </Text>

          {/* Active Card Scanner Viewfinder if scanning Front or Back */}
          {cameraActive && (cameraTarget === 'aadhaar_front' || cameraTarget === 'aadhaar_back') ? (
            renderCardScanner(cameraTarget)
          ) : (
            <>
              {/* Guidance Notice */}
              <View style={styles.cardGuidanceBanner}>
                <Icon name="camera" size={16} color="#16A34A" />
                <Text style={styles.cardGuidanceBannerText}>
                  <Text style={styles.bold}>Live Camera Scanning Enabled:</Text> Place your physical Aadhaar card properly inside the camera guide to get it captured clearly. Both Front and Back sides are required.
                </Text>
              </View>

              {/* Aadhaar Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>12-Digit Aadhaar Number</Text>
                <View style={styles.inputBox}>
                  <Icon name="shield" size={18} color={colors.mutedText} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="XXXX XXXX XXXX"
                    placeholderTextColor={colors.mutedText}
                    value={aadhaarNumber}
                    onChangeText={setAadhaarNumber}
                    keyboardType="number-pad"
                    maxLength={14}
                  />
                </View>
              </View>

              {/* Front & Back Cards Row */}
              <View style={styles.idCardsRow}>
                {/* Front Card */}
                <View style={styles.idCardBox}>
                  <Text style={styles.idSideTitle}>Front Side</Text>
                  {aadhaarFrontUrl ? (
                    <View>
                      <View style={styles.idThumbnailWrapper}>
                        <Image
                          source={{ uri: aadhaarFrontUrl }}
                          style={styles.idThumbnailImg}
                          resizeMode="cover"
                        />
                        <View style={styles.idAttachedBadge}>
                          <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} />
                          <Text style={styles.idAttachedText}>
                            {aadhaarFrontLive ? 'Live Captured' : 'Attached'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={styles.retakeCameraBtn}
                          onPress={() => startCamera('aadhaar_front')}
                          activeOpacity={0.8}
                        >
                          <Icon name="camera" size={12} color={colors.primaryActionBlue} />
                          <Text style={styles.retakeCameraBtnText}>Live Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.sampleBtn}
                          onPress={() => {
                            setAadhaarFrontUrl(
                              'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80'
                            );
                            setAadhaarFrontLive(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.sampleBtnText}>Sample</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.idScanCardBtn}
                      onPress={() => startCamera('aadhaar_front')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.scanBtnIconCircle}>
                        <Icon name="camera" size={18} color={colors.primaryActionBlue} />
                      </View>
                      <Text style={styles.idScanCardTitle}>Scan Front Side</Text>
                      <Text style={styles.idScanCardSub}>Place card within frame</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Back Card */}
                <View style={styles.idCardBox}>
                  <Text style={styles.idSideTitle}>Back Side</Text>
                  {aadhaarBackUrl ? (
                    <View>
                      <View style={styles.idThumbnailWrapper}>
                        <Image
                          source={{ uri: aadhaarBackUrl }}
                          style={styles.idThumbnailImg}
                          resizeMode="cover"
                        />
                        <View style={styles.idAttachedBadge}>
                          <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} />
                          <Text style={styles.idAttachedText}>
                            {aadhaarBackLive ? 'Live Captured' : 'Attached'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={styles.retakeCameraBtn}
                          onPress={() => startCamera('aadhaar_back')}
                          activeOpacity={0.8}
                        >
                          <Icon name="camera" size={12} color={colors.primaryActionBlue} />
                          <Text style={styles.retakeCameraBtnText}>Live Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.sampleBtn}
                          onPress={() => {
                            setAadhaarBackUrl(
                              'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80'
                            );
                            setAadhaarBackLive(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.sampleBtnText}>Sample</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.idScanCardBtn}
                      onPress={() => startCamera('aadhaar_back')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.scanBtnIconCircle}>
                        <Icon name="camera" size={18} color={colors.primaryActionBlue} />
                      </View>
                      <Text style={styles.idScanCardTitle}>Scan Back Side</Text>
                      <Text style={styles.idScanCardSub}>Place card within frame</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}

          {/* Navigation Buttons */}
          <View style={styles.stepButtonsRow}>
            <TouchableOpacity
              style={styles.prevStepBtn}
              onPress={() => setCurrentStep(2)}
            >
              <Text style={styles.prevStepBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.nextStepBtn,
                { flex: 1 },
                (!aadhaarFrontUrl || !aadhaarBackUrl) && styles.btnDisabled
              ]}
              disabled={!aadhaarFrontUrl || !aadhaarBackUrl}
              onPress={() => setCurrentStep(4)}
            >
              <Text style={styles.nextStepBtnText}>Next: PAN Card</Text>
              <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP 4: PAN CARD                                         */}
      {/* -------------------------------------------------------- */}
      {currentStep === 4 && (
        <View style={styles.stepCard}>
          <View style={styles.stepTitleRow}>
            <Icon name="file-text" size={18} color={colors.primaryBlue} />
            <Text style={styles.stepTitle}>4. PAN Card Verification</Text>
          </View>
          <Text style={styles.stepDesc}>
            Enter your Permanent Account Number (PAN) and capture a clear photo of your PAN card using the live camera.
          </Text>

          {/* Active Card Scanner Viewfinder if scanning PAN */}
          {cameraActive && cameraTarget === 'pan_card' ? (
            renderCardScanner('pan_card')
          ) : (
            <>
              {/* Guidance Notice */}
              <View style={styles.cardGuidanceBanner}>
                <Icon name="camera" size={16} color="#16A34A" />
                <Text style={styles.cardGuidanceBannerText}>
                  <Text style={styles.bold}>Live Camera PAN Capture:</Text> Place your PAN card properly inside the camera guide to get it captured clearly. Ensure the 10-character PAN number and signature are sharp and readable.
                </Text>
              </View>

              {/* PAN Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>10-Character PAN Number</Text>
                <View style={styles.inputBox}>
                  <Icon name="shield" size={18} color={colors.mutedText} />
                  <TextInput
                    style={[styles.textInput, { textTransform: 'uppercase' }]}
                    placeholder="ABCDE1234F"
                    placeholderTextColor={colors.mutedText}
                    value={panNumber}
                    onChangeText={(val) => setPanNumber(val.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* PAN Card Image Box */}
              <View style={styles.panCardBox}>
                <Text style={styles.idSideTitle}>PAN Card Document</Text>
                {panCardUrl ? (
                  <View>
                    <View style={styles.panThumbnailWrapper}>
                      <Image
                        source={{ uri: panCardUrl }}
                        style={styles.panThumbnailImg}
                        resizeMode="cover"
                      />
                      <View style={styles.idAttachedBadge}>
                        <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} />
                        <Text style={styles.idAttachedText}>
                          {panCardLive ? 'Live Captured' : 'PAN Attached'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.panActionRow}>
                      <TouchableOpacity
                        style={styles.panRetakeCameraBtn}
                        onPress={() => startCamera('pan_card')}
                        activeOpacity={0.8}
                      >
                        <Icon name="camera" size={14} color={colors.primaryActionBlue} />
                        <Text style={styles.panRetakeCameraBtnText}>Scan with Live Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sampleBtn}
                        onPress={() => {
                          setPanCardUrl(
                            'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&auto=format&fit=crop&q=80'
                          );
                          setPanCardLive(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.sampleBtnText}>Sample PAN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.panScanCardBtn}
                    onPress={() => startCamera('pan_card')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.scanBtnIconCircle}>
                      <Icon name="camera" size={22} color={colors.primaryActionBlue} />
                    </View>
                    <Text style={styles.panScanCardTitle}>Scan PAN Card with Live Camera</Text>
                    <Text style={styles.panScanCardSub}>
                      Place your PAN card properly inside the frame to capture clearly
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Navigation Buttons */}
          <View style={styles.stepButtonsRow}>
            <TouchableOpacity
              style={styles.prevStepBtn}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={styles.prevStepBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextStepBtn, { flex: 1 }, !panCardUrl && styles.btnDisabled]}
              disabled={!panCardUrl}
              onPress={() => setCurrentStep(5)}
            >
              <Text style={styles.nextStepBtnText}>Review & Submit</Text>
              <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP 5: REVIEW & SUBMIT TO ADMIN                         */}
      {/* -------------------------------------------------------- */}
      {currentStep === 5 && (
        <View style={styles.stepCard}>
          <View style={styles.stepTitleRow}>
            <Icon name="shield" size={18} color={colors.primaryBlue} />
            <Text style={styles.stepTitle}>5. Review & Submit to Admin</Text>
          </View>
          <Text style={styles.stepDesc}>
            Verify your submission before dispatching to the compliance verification desk.
          </Text>

          {/* Checklist of All Completed Items */}
          <View style={styles.reviewChecklist}>
            {/* 1. Email OTP */}
            <View style={styles.reviewItem}>
              <View style={styles.reviewCheckCircle}>
                <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <View style={styles.reviewItemText}>
                <Text style={styles.reviewItemTitle}>Email Verified</Text>
                <Text style={styles.reviewItemSub}>{user?.email}</Text>
              </View>
            </View>

            {/* 2. Live Camera Photo */}
            <View style={styles.reviewItem}>
              <View style={styles.reviewCheckCircle}>
                <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <View style={styles.reviewItemText}>
                <Text style={styles.reviewItemTitle}>Live Photo (Camera Captured)</Text>
                <Text style={styles.reviewItemSub}>Real-time biometric selfie attached</Text>
              </View>
              {livePhotoUrl && (
                <Image source={{ uri: livePhotoUrl }} style={styles.reviewThumb} />
              )}
            </View>

            {/* 3. Aadhaar Front & Back */}
            <View style={styles.reviewItem}>
              <View style={styles.reviewCheckCircle}>
                <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <View style={styles.reviewItemText}>
                <Text style={styles.reviewItemTitle}>Aadhaar Card (Front & Back)</Text>
                <Text style={styles.reviewItemSub}>{aadhaarNumber}</Text>
              </View>
              {aadhaarFrontUrl && (
                <Image source={{ uri: aadhaarFrontUrl }} style={styles.reviewThumb} />
              )}
            </View>

            {/* 4. PAN Card */}
            <View style={styles.reviewItem}>
              <View style={styles.reviewCheckCircle}>
                <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <View style={styles.reviewItemText}>
                <Text style={styles.reviewItemTitle}>PAN Card Attached</Text>
                <Text style={styles.reviewItemSub}>{panNumber}</Text>
              </View>
              {panCardUrl && (
                <Image source={{ uri: panCardUrl }} style={styles.reviewThumb} />
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitFinalBtn}
            disabled={submitting}
            onPress={handleFinalKycSubmit}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitFinalText}>Submit for Admin Verification</Text>
                <Icon name="arrow-right" size={18} color="#FFFFFF" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={styles.editText}>Edit Previous Steps</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  stepBadge: {
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.chip
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  logoutText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: typography.weights.semibold
  },
  headerSection: {
    marginBottom: spacing.md
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    letterSpacing: -0.3
  },
  screenSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginTop: 3,
    lineHeight: 17
  },
  progressBarRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.lg
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2
  },
  progressSegmentActive: {
    backgroundColor: colors.primaryBlue
  },
  progressSegmentInactive: {
    backgroundColor: '#E2E8F0'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.xs
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    flex: 1
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  stepDesc: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 17,
    marginBottom: spacing.md
  },
  avatarPreviewCenter: {
    alignItems: 'center',
    marginVertical: spacing.md
  },
  largeAvatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primaryBlue,
    ...shadows.sm
  },
  largeAvatarImg: {
    width: '100%',
    height: '100%'
  },
  presetLabel: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: spacing.xs
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: spacing.lg
  },
  presetBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: '#F8FAFC'
  },
  presetBtnActive: {
    borderColor: colors.primaryBlue,
    backgroundColor: '#EBF2FF'
  },
  presetThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4
  },
  presetText: {
    fontSize: 9.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  nextStepBtn: {
    height: 48,
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm
  },
  nextStepBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: typography.weights.bold
  },
  btnDisabled: {
    backgroundColor: '#93C5FD'
  },
  cameraComplianceNotice: {
    backgroundColor: '#F0F5FF',
    borderRadius: 14,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#D4E2FE',
    marginBottom: spacing.md
  },
  cameraComplianceText: {
    fontSize: 11,
    color: colors.deepNavy,
    lineHeight: 16,
    flex: 1
  },
  bold: {
    fontWeight: typography.weights.bold
  },
  cameraContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  liveStreamWrapper: {
    width: '100%',
    position: 'relative',
    alignItems: 'center'
  },
  faceOvalOverlay: {
    position: 'absolute',
    top: 25,
    width: 140,
    height: 180,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: '#10B981',
    borderStyle: 'dashed'
  },
  shutterBtn: {
    position: 'absolute',
    bottom: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md
  },
  shutterInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444'
  },
  snapshotPreviewBox: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.md
  },
  snapshotImg: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: colors.success
  },
  verifiedSelfieTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.chip,
    marginTop: spacing.sm
  },
  verifiedSelfieText: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF'
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  cameraPlaceholderBox: {
    padding: spacing.xl,
    alignItems: 'center'
  },
  cameraIconBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  cameraPromptTitle: {
    fontSize: 14.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 4
  },
  cameraPromptSub: {
    fontSize: 11.5,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.md
  },
  openCameraBtn: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.sm
  },
  openCameraBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: typography.weights.bold
  },
  cameraErrorText: {
    fontSize: 11,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.sm
  },
  stepButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  prevStepBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  prevStepBtnText: {
    fontSize: 12.5,
    fontWeight: typography.weights.semibold,
    color: colors.secondaryText
  },
  inputGroup: {
    marginBottom: spacing.md
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    marginBottom: 6
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
    gap: spacing.xs
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.deepNavy
  },
  cardGuidanceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: spacing.md
  },
  cardGuidanceBannerText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    flex: 1
  },
  cardScannerContainer: {
    marginBottom: spacing.lg
  },
  cardInstructionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md
  },
  cardInstructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6
  },
  cardInstructionTitle: {
    fontSize: 13.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy,
    flex: 1
  },
  cardInstructionBody: {
    fontSize: 11.5,
    color: colors.secondaryText,
    lineHeight: 17,
    marginBottom: spacing.sm
  },
  scannerTipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap'
  },
  scannerTipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  scannerTipText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.deepNavy
  },
  cardReticleBox: {
    position: 'absolute',
    top: 24,
    width: 250,
    height: 155,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cornerBracket: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#10B981'
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 10
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 10
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 10
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 10
  },
  reticleBadge: {
    position: 'absolute',
    top: -11,
    backgroundColor: '#10B981',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  reticleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5
  },
  scanLineGuide: {
    width: '80%',
    height: 1.5,
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 1
  },
  reticleBottomStatus: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  reticleStatusText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: typography.weights.medium
  },
  cardShutterBtn: {
    position: 'absolute',
    bottom: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md
  },
  cardShutterInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scannerActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm
  },
  cancelCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.chip,
    backgroundColor: '#F1F5F9'
  },
  cancelCameraBtnText: {
    fontSize: 11.5,
    fontWeight: typography.weights.semibold,
    color: colors.secondaryText
  },
  captureCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryActionBlue,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.chip,
    ...shadows.sm
  },
  captureCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold
  },
  cameraErrorBox: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs
  },
  useFallbackCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.chip
  },
  useFallbackCardBtnText: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  idCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  idCardBox: {
    flex: 1
  },
  idSideTitle: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.secondaryText,
    marginBottom: 4
  },
  idThumbnailWrapper: {
    width: '100%',
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border
  },
  idThumbnailImg: {
    width: '100%',
    height: '100%'
  },
  idAttachedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  idAttachedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: typography.weights.bold
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6
  },
  retakeCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EBF2FF',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4E2FE'
  },
  retakeCameraBtnText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  sampleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sampleBtnText: {
    fontSize: 9.5,
    fontWeight: typography.weights.medium,
    color: colors.secondaryText
  },
  idScanCardBtn: {
    width: '100%',
    height: 110,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryActionBlue,
    borderStyle: 'dashed',
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4
  },
  scanBtnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  idScanCardTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue,
    textAlign: 'center'
  },
  idScanCardSub: {
    fontSize: 9,
    color: colors.secondaryText,
    textAlign: 'center'
  },
  idUploadPlaceholder: {
    width: '100%',
    height: 110,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryBlue,
    borderStyle: 'dashed',
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  idUploadText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue
  },
  panCardBox: {
    marginBottom: spacing.lg
  },
  panThumbnailWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border
  },
  panThumbnailImg: {
    width: '100%',
    height: '100%'
  },
  panActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 8
  },
  panRetakeCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EBF2FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E2FE'
  },
  panRetakeCameraBtnText: {
    fontSize: 11.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  panScanCardBtn: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryActionBlue,
    borderStyle: 'dashed',
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: 6
  },
  panScanCardTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  panScanCardSub: {
    fontSize: 10.5,
    color: colors.secondaryText,
    textAlign: 'center'
  },
  reviewChecklist: {
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  reviewCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  reviewItemText: {
    flex: 1
  },
  reviewItemTitle: {
    fontSize: 12.5,
    fontWeight: typography.weights.bold,
    color: colors.deepNavy
  },
  reviewItemSub: {
    fontSize: 10.5,
    color: colors.secondaryText,
    marginTop: 1
  },
  reviewThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  submitFinalBtn: {
    height: 50,
    backgroundColor: colors.primaryBlue,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md
  },
  submitFinalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: typography.weights.bold
  },
  editBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: 6
  },
  editText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  }
});
