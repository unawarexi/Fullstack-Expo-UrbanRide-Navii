import React, { useState } from "react";
import { Platform, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

// Add Picker for year/month selection
import { Picker } from "@react-native-picker/picker";

interface CalendarComponentProps {
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
}

const CalendarComponent: React.FC<CalendarComponentProps> = ({ onDateSelect, selectedDate, minDate, maxDate }) => {
  const [selected, setSelected] = useState<string>(selectedDate || "");
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.toISOString().slice(0, 7));

  // For year/month picker
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - 15 + i); // 15 years before and after
  const months = [
    { label: "Jan", value: "01" }, { label: "Feb", value: "02" }, { label: "Mar", value: "03" }, { label: "Apr", value: "04" },
    { label: "May", value: "05" }, { label: "Jun", value: "06" }, { label: "Jul", value: "07" }, { label: "Aug", value: "08" },
    { label: "Sep", value: "09" }, { label: "Oct", value: "10" }, { label: "Nov", value: "11" }, { label: "Dec", value: "12" },
  ];
  const [pickerYear, setPickerYear] = useState(currentMonth.slice(0, 4));
  const [pickerMonth, setPickerMonth] = useState(currentMonth.slice(5, 7));

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const scaleAnim = useSharedValue(0.95);

  React.useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withSpring(0, { damping: 12, stiffness: 100 });
    scaleAnim.value = withSpring(1, { damping: 10, stiffness: 120 });
  }, []);

  // When year/month picker changes, update calendar
  React.useEffect(() => {
    setCurrentMonth(`${pickerYear}-${pickerMonth}`);
  }, [pickerYear, pickerMonth]);

  const handleDayPress = (day: DateData) => {
    setSelected(day.dateString);
    onDateSelect?.(day.dateString);

    // Add a subtle bounce animation when selecting a date
    scaleAnim.value = withSpring(0.98, { damping: 10, stiffness: 200 }, () => {
      scaleAnim.value = withSpring(1, { damping: 10, stiffness: 200 });
    });
  };

  const handleMonthChange = (month: DateData) => {
    setCurrentMonth(month.dateString.slice(0, 7));
    setPickerYear(month.dateString.slice(0, 4));
    setPickerMonth(month.dateString.slice(5, 7));
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }, { scale: scaleAnim.value }],
  }));

  // Smaller calendar theme
  const calendarTheme = {
    backgroundColor: "#ffffff",
    calendarBackground: "#ffffff",
    textSectionTitleColor: "#2563eb",
    textSectionTitleDisabledColor: "#9ca3af",
    selectedDayBackgroundColor: "#3b82f6",
    selectedDayTextColor: "#ffffff",
    todayTextColor: "#1d4ed8",
    dayTextColor: "#374151",
    textDisabledColor: "#d1d5db",
    dotColor: "#3b82f6",
    selectedDotColor: "#ffffff",
    arrowColor: "#3b82f6",
    disabledArrowColor: "#d1d5db",
    monthTextColor: "#1f2937",
    indicatorColor: "#3b82f6",
    textDayFontFamily: "System",
    textMonthFontFamily: "System",
    textDayHeaderFontFamily: "System",
    textDayFontWeight: "400",
    textMonthFontWeight: "700",
    textDayHeaderFontWeight: "600",
    textDayFontSize: 12, // smaller
    textMonthFontSize: 14, // smaller
    textDayHeaderFontSize: 11, // smaller
  };

  const markedDates = {
    ...(selected && {
      [selected]: {
        selected: true,
        selectedColor: "#3b82f6",
        selectedTextColor: "#ffffff",
      },
    }),
    [today.toISOString().split("T")[0]]: {
      ...(selected === today.toISOString().split("T")[0]
        ? {
            selected: true,
            selectedColor: "#3b82f6",
            selectedTextColor: "#ffffff",
          }
        : {}),
      marked: true,
      dotColor: "#60a5fa",
    },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <Animated.View
        style={[
          animatedStyle,
          {
            margin: 8,
            backgroundColor: "#fff",
            borderRadius: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
            minWidth: 260,
            maxWidth: 320,
            alignSelf: "center",
          },
        ]}
      >
        {/* Header */}
        <View style={{ backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 10, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomWidth: 1, borderBottomColor: "#dbeafe" }}>
          <Text style={{ fontSize: 15, fontWeight: "bold", color: "#1e3a8a", textAlign: "center", marginBottom: 2 }}>Select Date</Text>
          <Text style={{ fontSize: 12, fontWeight: "500", color: "#2563eb", textAlign: "center" }}>
            {selected
              ? new Date(selected).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "No date selected"}
          </Text>
        </View>

        {/* Year/Month Picker */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4, marginBottom: 2 }}>
          <Picker
            selectedValue={pickerYear}
            style={{
              width: 90,
              height: Platform.OS === "ios" ? 32 : 28,
              marginRight: 6,
              fontSize: 12,
            }}
            onValueChange={(itemValue : any) => setPickerYear(itemValue)}
            mode="dropdown"
            dropdownIconColor="#2563eb"
          >
            {years.map((year) => (
              <Picker.Item key={year} label={year.toString()} value={year.toString()} />
            ))}
          </Picker>
          <Picker
            selectedValue={pickerMonth}
            style={{
              width: 70,
              height: Platform.OS === "ios" ? 32 : 28,
              fontSize: 12,
            }}
            onValueChange={(itemValue : any) => setPickerMonth(itemValue)}
            mode="dropdown"
            dropdownIconColor="#2563eb"
          >
            {months.map((m) => (
              <Picker.Item key={m.value} label={m.label} value={m.value} />
            ))}
          </Picker>
        </View>

        {/* Calendar */}
        <View style={{ paddingHorizontal: 6, paddingTop: 6 }}>
          <Calendar
            style={{
              borderRadius: 12,
              minHeight: 260,
              maxHeight: 300,
              padding: 0,
              width: "100%",
            }}
            current={currentMonth + "-01"}
            minDate={minDate}
            maxDate={maxDate}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
            markingType="simple"
            markedDates={markedDates}
            theme={calendarTheme}
            hideArrows={false}
            hideExtraDays={false}
            disableMonthChange={false}
            firstDay={1}
            hideDayNames={false}
            showWeekNumbers={false}
            disableArrowLeft={false}
            disableArrowRight={false}
            disableAllTouchEventsForDisabledDays={true}
            enableSwipeMonths={true}
          />
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
          <TouchableOpacity
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: "#f9fafb",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
            }}
            onPress={() => {
              setSelected("");
              onDateSelect?.("");
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280" }}>Clear Selection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: "#2563eb",
              borderRadius: 10,
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 1,
            }}
            onPress={() => {
              const todayStr = today.toISOString().split("T")[0];
              setSelected(todayStr);
              onDateSelect?.(todayStr);
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Date Display */}
        {selected && (
          <View style={{ marginHorizontal: 10, marginBottom: 10, padding: 8, backgroundColor: "#eff6ff", borderColor: "#dbeafe", borderWidth: 1, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#1e40af", textAlign: "center", marginBottom: 1 }}>Selected</Text>
            <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1e3a8a", textAlign: "center" }}>{selected}</Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

export default CalendarComponent;
