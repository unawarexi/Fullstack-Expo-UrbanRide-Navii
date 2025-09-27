import { CustomBottomSheetProps } from "@/core/types/type";
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo } from "react";
import { Platform, } from "react-native";



const CustomBottomSheet = forwardRef<BottomSheet, CustomBottomSheetProps>((props, ref) => {
  const {
    isVisible,
    onClose,
    enableSnapping = true,
    snapPoints = Platform.OS === "ios" ? ["50%"] : ["55%"],
    initialSnapIndex = 0,
    enablePanDownToClose = true,
    enableOverDrag = true,
    enableHandlePanningGesture = true,
    enableContentPanningGesture = true,
    enableBackdrop = true,
    backdropOpacity = 0.5,
    backdropAppearanceOnIndex = 0,
    backdropDisappearOnIndex = -1,
    backgroundStyle,
    handleStyle,
    handleIndicatorStyle,
    children,
    scrollable = false,
    keyboardBehavior = "interactive",
    keyboardBlurBehavior = "restore",
    animateOnMount = true,
    animationConfigs,
    onChange,
    onAnimate,
  } = props;

  // Memoized snap points
  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

  // Backdrop component
  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => <BottomSheetBackdrop {...backdropProps} opacity={backdropOpacity} appearsOnIndex={backdropAppearanceOnIndex}
      disappearsOnIndex={backdropDisappearOnIndex} onPress={onClose} />,
    [backdropOpacity, backdropAppearanceOnIndex, backdropDisappearOnIndex, onClose]
  );

  // Handle sheet changes
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
      onChange?.(index);
    },
    [onChange, onClose]
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={ref}
      snapPoints={enableSnapping ? memoizedSnapPoints : undefined}
      index={enableSnapping ? initialSnapIndex : -1}
      enablePanDownToClose={enablePanDownToClose}
      enableOverDrag={enableOverDrag}
      enableHandlePanningGesture={enableHandlePanningGesture}
      enableContentPanningGesture={enableContentPanningGesture}
      backdropComponent={enableBackdrop ? renderBackdrop : undefined}
      backgroundStyle={backgroundStyle}
      handleStyle={handleStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      animateOnMount={animateOnMount}
      animationConfigs={animationConfigs}
      onChange={handleSheetChanges}
      onAnimate={onAnimate}
    >
      {scrollable ? <BottomSheetScrollView>{children}</BottomSheetScrollView> : <BottomSheetView>{children}</BottomSheetView>}
    </BottomSheet>
  );
});

CustomBottomSheet.displayName = "CustomBottomSheet";

export default CustomBottomSheet;

// // Example usage component
// export const ExampleUsage = () => {
//   const [isVisible, setIsVisible] = React.useState(false);
//   const bottomSheetRef = React.useRef<BottomSheet>(null);

//   const handleOpen = () => setIsVisible(true);
//   const handleClose = () => setIsVisible(false);

//   return (
//     <>
//       {/* Your trigger component */}

//       <CustomBottomSheet
//         ref={bottomSheetRef}
//         isVisible={isVisible}
//         onClose={handleClose}
//         enableSnapping={true}
//         snapPoints={["25%", "50%", "90%"]}
//         initialSnapIndex={1}
//         enableBackdrop={true}
//         backdropOpacity={0.7}
//         scrollable={true}
//         backgroundStyle={{
//           backgroundColor: "#f8f9fa",
//           borderRadius: 24,
//         }}
//         handleIndicatorStyle={{
//           backgroundColor: "#d1d5db",
//         }}
//         onChange={(index) => console.log("Sheet index changed to:", index)}
//       >
//         {/* Your content here */}
//         <div>Your bottom sheet content goes here</div>
//       </CustomBottomSheet>
//     </>
//   );
// };
