#include <iostream>
using namespace std;

int main () {

    int arr[5] = {10 , 4, 3, 4, 6};

    for(int i=0; i<4; i++) {

        int index = i;
        for(int j = i+1; j<5 ; j++){

            if (arr[j]<arr[index])
            index = j;
        }

        swap(arr[i],arr[index]);
    }

    for (int i=0; i<5; i++) {
        cout<<arr[i]<<" ";
    }


}


