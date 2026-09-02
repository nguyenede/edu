package com.app.quanlyhocsinh.core.utils

import java.util.Calendar
import java.util.Date

object AppFormatters {
    private val weekdays = listOf(
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
        "Chủ Nhật"
    )

    private val weekdaysShort = listOf(
        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7",
        "CN"
    )

    private val months = listOf(
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12"
    )

    private fun getCalendar(date: Date): Calendar {
        val cal = Calendar.getInstance()
        cal.time = date
        return cal
    }

    private fun getWeekdayIndex(date: Date): Int {
        val cal = getCalendar(date)
        return when (cal.get(Calendar.DAY_OF_WEEK)) {
            Calendar.MONDAY -> 0
            Calendar.TUESDAY -> 1
            Calendar.WEDNESDAY -> 2
            Calendar.THURSDAY -> 3
            Calendar.FRIDAY -> 4
            Calendar.SATURDAY -> 5
            Calendar.SUNDAY -> 6
            else -> 0
        }
    }

    fun weekday(date: Date): String {
        return weekdays[getWeekdayIndex(date)]
    }

    fun weekdayShort(date: Date): String {
        return weekdaysShort[getWeekdayIndex(date)]
    }

    fun dayMonth(date: Date): String {
        val cal = getCalendar(date)
        val d = cal.get(Calendar.DAY_OF_MONTH)
        val m = cal.get(Calendar.MONTH) + 1
        return "${twoDigits(d)}/${twoDigits(m)}"
    }

    fun dayMonthYear(date: Date): String {
        val cal = getCalendar(date)
        val d = cal.get(Calendar.DAY_OF_MONTH)
        val m = cal.get(Calendar.MONTH) + 1
        val y = cal.get(Calendar.YEAR)
        return "${twoDigits(d)}/${twoDigits(m)}/$y"
    }

    fun monthYear(date: Date): String {
        val cal = getCalendar(date)
        val m = cal.get(Calendar.MONTH)
        val y = cal.get(Calendar.YEAR)
        return "${months[m]} $y"
    }

    fun timeOfDay(date: Date): String {
        val cal = getCalendar(date)
        val h = cal.get(Calendar.HOUR_OF_DAY)
        val min = cal.get(Calendar.MINUTE)
        return "${twoDigits(h)}:${twoDigits(min)}"
    }

    fun currency(value: Double): String {
        val rounded = Math.round(value).toString()
        val buffer = StringBuilder()
        for (i in rounded.indices) {
            val reverseIndex = rounded.length - i
            buffer.append(rounded[i])
            if (reverseIndex > 1 && reverseIndex % 3 == 1) {
                buffer.append('.')
            }
        }
        return "${buffer} đ"
    }

    fun countdownTo(date: Date): String {
        val now = Date().time
        val diffMs = date.time - now
        if (diffMs < 0) {
            return "Đã diễn ra"
        }
        val diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays >= 1) {
            return "Còn $diffDays ngày"
        }
        val diffHours = diffMs / (1000 * 60 * 60)
        if (diffHours >= 1) {
            return "Còn $diffHours giờ"
        }
        return "Sắp bắt đầu"
    }

    private fun twoDigits(value: Int): String {
        return value.toString().padStart(2, '0')
    }
}
