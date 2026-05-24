#include <iostream>
using namespace std;



int BinarySearch(int arr[] , int n , int key) {

    int start = 0 , end = n-1 , mid;

    while ( start <= end ) {

        mid = (start+end)/2;

        if ( arr[mid] == key ) {
            return mid;
        }

        else if (arr[mid] < key ) {
            start = mid + 1;
        }

        else if (arr[mid] > key) {
            end = mid - 1;
        }
    }

    return -1;
}

int main () {
    
    int arr[1000];

    int n;
    cout<<"enter the number of elements :";
    cin>>n;

    cout<<"enter the elements :";
    for(int i=0;i<n;i++){
        cin>>arr[i];
    }

    int key;
    cout<<"enter the element to find:";
    cin>>key;

    cout<<BinarySearch(arr , n , key);

    return 0;
}