import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';

export function OpportunitiesSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Opportunities Settings
          </CardTitle>
          <CardDescription>Configure automatic content opportunity generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-generate">Automatic Generation</Label>
              <p className="text-sm text-muted-foreground">Automatically generate opportunities daily</p>
            </div>
            <Switch id="auto-generate" />
          </div>

          <div>
            <Label htmlFor="frequency">Generation Frequency</Label>
            <Select defaultValue="daily">
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="max-opportunities">Maximum Number of Opportunities</Label>
            <Select defaultValue="10">
              <SelectTrigger id="max-opportunities">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="min-search-volume">Minimum Search Volume</Label>
            <Select defaultValue="100">
              <SelectTrigger id="min-search-volume">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 searches/month</SelectItem>
                <SelectItem value="100">100 searches/month</SelectItem>
                <SelectItem value="500">500 searches/month</SelectItem>
                <SelectItem value="1000">1000+ searches/month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}