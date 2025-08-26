/* eslint-disable @typescript-eslint/no-unused-vars */

import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Component } from "lucide-react-native";
import React, { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

const CustomBottomSheet = () => {
    const bottomSheetRef = useRef<BottomSheet>(null); 
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const snapPoints = Platform.OS === "ios" ? ["55%"] : ["60%"];
    
  return (
    <View>
      {showBottomSheet && (
        <BottomSheet ref={bottomSheetRef} snapPoints={snapPoints} onClose={() => setShowBottomSheet(false)} enablePanDownToClose={true} index={0} >
          <BottomSheetView>
           <Component />
          </BottomSheetView>
        </BottomSheet>
      )}
    </View>
  );
}

export default CustomBottomSheet