package com.goldmirubada.laobus;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.pm.ActivityInfo;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Responsive Orientation Control
        // If it's not a tablet (phone), force Portrait mode.
        // If it is a tablet (sw600dp+), allow rotation.
        boolean isTablet = getResources().getBoolean(R.bool.is_tablet);
        if (!isTablet) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }
}
